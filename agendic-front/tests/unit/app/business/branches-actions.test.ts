import { createBranchAction, uploadBranchImageAction } from '@/app/(app)/business/branches/actions';
import { BranchImageLimitError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateBranchController: jest.fn(),
    IUploadBranchImageController: jest.fn(),
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
    it('returns the new Sucursal id and refreshes', async () => {
        mockControllers.ICreateBranchController.mockResolvedValue({ id: 9, name: 'Centro' });

        await expect(createBranchAction({ name: 'Centro' })).resolves.toEqual({ ok: true, data: { id: 9 } });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('puts the 409 under the slug field', async () => {
        mockControllers.ICreateBranchController.mockRejectedValue(new SlugTakenError('Booking link already in use'));

        await expect(createBranchAction({})).resolves.toEqual({ ok: false, field: 'slug', message: 'Esa dirección ya está en uso.' });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('reports unexpected errors with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.ICreateBranchController.mockRejectedValue(error);

        const result = await createBranchAction({});
        expect(result.ok).toBe(false);
        expect(mockReport).toHaveBeenCalledWith(error);
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
