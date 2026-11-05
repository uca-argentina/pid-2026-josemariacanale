import {
    createBranchAction,
    deleteBranchImageAction,
    getTimeZoneAction,
    updateBranchAction,
    uploadBranchImageAction,
} from '@/app/(app)/business/branches/actions';
import {
    BranchImageLimitError,
    BranchImagesRejectedError,
    InvalidLocationError,
    LastBranchImageError,
    SlugTakenError,
} from '@/src/entities/errors/business';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateBranchController: jest.fn(),
    IUpdateBranchController: jest.fn(),
    IGetTimeZoneController: jest.fn(),
    IUploadBranchImageController: jest.fn(),
    IDeleteBranchImageController: jest.fn(),
};
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/cache', () => ({ refresh: () => mockRefresh() }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    unstable_rethrow: (error: Error) => {
        if (/^REDIRECT/.test(error.message)) throw error;
    },
}));

beforeEach(() => jest.clearAllMocks());

describe('createBranchAction', () => {
    /** The images as the dialog sends them: every file in the `images` field of a FormData. */
    const imagesForm = (...names: string[]) => {
        const form = new FormData();
        for (const name of names) form.append('images', new File(['x'], name, { type: 'image/png' }));
        return form;
    };

    it('sends the fields and the images in the same request, returning the new Sucursal id', async () => {
        mockControllers.ICreateBranchController.mockResolvedValue({ id: 9, name: 'Centro' });

        await expect(createBranchAction({ name: 'Centro' }, imagesForm('a.png', 'b.png'))).resolves.toEqual({
            ok: true,
            data: { id: 9 },
        });
        expect(mockControllers.ICreateBranchController).toHaveBeenCalledTimes(1);
        const [input] = mockControllers.ICreateBranchController.mock.calls[0];
        expect(input.name).toBe('Centro');
        expect(input.images.map((file: File) => file.name)).toEqual(['a.png', 'b.png']);
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('does not call the back without images', async () => {
        await expect(createBranchAction({ name: 'Centro' }, new FormData())).resolves.toEqual({
            ok: false,
            message: 'Elegí al menos una imagen.',
        });
        expect(mockControllers.ICreateBranchController).not.toHaveBeenCalled();
    });

    it('puts the 409 under the slug field', async () => {
        mockControllers.ICreateBranchController.mockRejectedValue(new SlugTakenError('Booking link already in use'));

        await expect(createBranchAction({}, imagesForm('a.png'))).resolves.toEqual({
            ok: false,
            field: 'slug',
            message: 'Esa dirección ya está en uso.',
        });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('puts a 400 about the Ubicación under the address field, without reporting it', async () => {
        mockControllers.ICreateBranchController.mockRejectedValue(new InvalidLocationError('location is required'));

        await expect(createBranchAction({}, imagesForm('a.png'))).resolves.toEqual({
            ok: false,
            field: 'address',
            message: 'Elegí una dirección de la lista.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it.each([
        ['type', 'Las imágenes tienen que ser JPEG, PNG, WebP o GIF.'],
        ['size', 'Cada imagen puede pesar hasta 5 MB.'],
        ['count', 'Elegí entre una y cinco imágenes.'],
    ] as const)('explains an image rejected for its %s, without reporting it', async (reason, message) => {
        mockControllers.ICreateBranchController.mockRejectedValue(new BranchImagesRejectedError('x', { reason }));

        await expect(createBranchAction({}, imagesForm('a.png'))).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reports unexpected errors with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.ICreateBranchController.mockRejectedValue(error);

        const result = await createBranchAction({}, imagesForm('a.png'));
        expect(result.ok).toBe(false);
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('updateBranchAction', () => {
    it('sends the new Ubicación and refreshes', async () => {
        const location = { lat: -34.6, lng: -58.4 };
        mockControllers.IUpdateBranchController.mockResolvedValue({ id: 4, location });

        await expect(updateBranchAction({ id: 4, address: 'Av. 2', location })).resolves.toMatchObject({ ok: true });
        expect(mockControllers.IUpdateBranchController).toHaveBeenCalledWith({ id: 4, address: 'Av. 2', location });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('puts the 400 of removing the Ubicación under the address field', async () => {
        mockControllers.IUpdateBranchController.mockRejectedValue(new InvalidLocationError('location cannot be removed'));

        await expect(updateBranchAction({ id: 4 })).resolves.toEqual({
            ok: false,
            field: 'address',
            message: 'Elegí una dirección de la lista.',
        });
    });
});

describe('getTimeZoneAction', () => {
    it('returns the zona horaria of the punto', async () => {
        mockControllers.IGetTimeZoneController.mockResolvedValue({ timeZone: 'America/Argentina/Cordoba' });

        await expect(getTimeZoneAction({ lat: -31.4, lng: -64.2 })).resolves.toBe('America/Argentina/Cordoba');
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('returns null and reports it when the Time Zone API fails, so the form keeps the one it had', async () => {
        const error = new ApiRequestError('Time Zone API answered ZERO_RESULTS');
        mockControllers.IGetTimeZoneController.mockRejectedValue(error);

        await expect(getTimeZoneAction({ lat: 0, lng: 0 })).resolves.toBeNull();
        expect(mockReport).toHaveBeenCalledWith(error);
    });

    it.each([
        ['no Sesión', new UnauthenticatedError('No hay Sesión')],
        ['an invalid punto', new InputParseError('Invalid data')],
    ])('returns null without reporting it on %s', async (_case, error) => {
        mockControllers.IGetTimeZoneController.mockRejectedValue(error);

        await expect(getTimeZoneAction({ lat: 0, lng: 0 })).resolves.toBeNull();
        expect(mockReport).not.toHaveBeenCalled();
    });
});

describe('uploadBranchImageAction', () => {
    it('passes the file from the form to the controller', async () => {
        mockControllers.IUploadBranchImageController.mockResolvedValue({ id: 1 });
        const file = new File(['x'], 'a.png', { type: 'image/png' });
        const form = new FormData();
        form.append('file', file);

        await uploadBranchImageAction(4, form);
        expect(mockControllers.IUploadBranchImageController).toHaveBeenCalledWith({ branchId: 4, file: expect.any(File) });
    });

    it('shows the 422 message of the image limit as is', async () => {
        mockControllers.IUploadBranchImageController.mockRejectedValue(new BranchImageLimitError('La Sucursal ya tiene 5 imágenes'));

        await expect(uploadBranchImageAction(4, new FormData())).resolves.toEqual({ ok: false, message: 'La Sucursal ya tiene 5 imágenes' });
        expect(mockReport).not.toHaveBeenCalled();
    });
});

describe('deleteBranchImageAction', () => {
    it('deletes the image and refreshes', async () => {
        mockControllers.IDeleteBranchImageController.mockResolvedValue(undefined);

        await expect(deleteBranchImageAction(4, 7)).resolves.toEqual({ ok: true, data: undefined });
        expect(mockControllers.IDeleteBranchImageController).toHaveBeenCalledWith({ branchId: 4, imageId: 7 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows the 409 of the last image as a toast message, without reporting it', async () => {
        mockControllers.IDeleteBranchImageController.mockRejectedValue(
            new LastBranchImageError('Branch 4 must keep at least one image'),
        );

        await expect(deleteBranchImageAction(4, 7)).resolves.toEqual({
            ok: false,
            message: 'La sucursal necesita al menos una imagen',
        });
        expect(mockReport).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
