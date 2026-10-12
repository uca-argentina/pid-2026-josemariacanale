import { createBusinessAction } from '@/app/(app)/business/actions';
import { BranchImagesRejectedError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateBusinessController: jest.fn(),
    IAddEmployeeController: jest.fn(),
    IUploadBusinessLogoController: jest.fn(),
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

const payload = {
    business: { name: 'Estudio', description: 'Desc', slug: 'estudio' },
    branch: { name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires' },
};
const file = (name: string) => new File(['x'], name, { type: 'image/png' });

function form({ logo, images = [], emails = [] }: { logo?: File; images?: File[]; emails?: string[] } = {}) {
    const data = new FormData();
    data.set('payload', JSON.stringify(payload));
    data.set('emails', JSON.stringify(emails));
    if (logo) data.set('logo', logo);
    images.forEach((image) => data.append('images', image));
    return data;
}

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue(undefined));
    mockControllers.ICreateBusinessController.mockResolvedValue({ id: 5, name: 'Estudio', slug: 'estudio', branchId: 9 });
});

describe('createBusinessAction', () => {
    it('sends the images of the Sucursal in the same request as the Negocio, then uploads the Logo apart', async () => {
        await expect(
            createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png'), file('b.png')] })),
        ).resolves.toEqual({ ok: true, failedEmployees: [], logoFailed: false });

        expect(mockControllers.ICreateBusinessController).toHaveBeenCalledTimes(1);
        const [input] = mockControllers.ICreateBusinessController.mock.calls[0];
        expect(input).toMatchObject(payload);
        expect(input.images.map((image: File) => image.name)).toEqual(['a.png', 'b.png']);
        expect(mockControllers.IUploadBusinessLogoController).toHaveBeenCalledWith({
            businessId: 5,
            file: expect.objectContaining({ name: 'logo.png' }),
        });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('does not call the back without images of the Sucursal', async () => {
        await expect(createBusinessAction(form({ logo: file('logo.png') }))).resolves.toEqual({
            ok: false,
            message: 'Elegí al menos una imagen de la Sucursal.',
        });
        expect(mockControllers.ICreateBusinessController).not.toHaveBeenCalled();
        expect(mockControllers.IUploadBusinessLogoController).not.toHaveBeenCalled();
    });

    it('uploads no Logo when none was chosen', async () => {
        await createBusinessAction(form({ images: [file('a.png')] }));

        expect(mockControllers.IUploadBusinessLogoController).not.toHaveBeenCalled();
    });

    it('keeps the Negocio and says so when the Logo fails to upload', async () => {
        mockControllers.IUploadBusinessLogoController.mockRejectedValue(new ApiRequestError('boom', { status: 500 }));

        await expect(createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png')] }))).resolves.toEqual({
            ok: true,
            failedEmployees: [],
            logoFailed: true,
        });
        expect(mockReport).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('reports the Invitaciones that fail', async () => {
        mockControllers.IAddEmployeeController.mockRejectedValueOnce(new ApiRequestError('boom', { status: 500 }));

        const result = await createBusinessAction(form({ images: [file('a.png')], emails: ['a@a.com', 'b@b.com'] }));

        expect(result).toEqual({ ok: true, failedEmployees: ['a@a.com'], logoFailed: false });
    });

    it.each([
        ['type', 'Las imágenes tienen que ser JPEG, PNG, WebP o GIF.'],
        ['size', 'Cada imagen puede pesar hasta 5 MB.'],
        ['count', 'Elegí entre una y cinco imágenes.'],
    ] as const)('explains images rejected for their %s, without reporting it', async (reason, message) => {
        mockControllers.ICreateBusinessController.mockRejectedValue(new BranchImagesRejectedError('x', { reason }));

        await expect(createBusinessAction(form({ images: [file('a.png')] }))).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('uploads no Logo when the Negocio is not created', async () => {
        mockControllers.ICreateBusinessController.mockRejectedValue(new ApiRequestError('boom', { status: 500 }));

        const result = await createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png')] }));

        expect(result.ok).toBe(false);
        expect(mockControllers.IUploadBusinessLogoController).not.toHaveBeenCalled();
    });

    it('answers ok: false, without creating anything, when the form is not JSON', async () => {
        const data = form({ images: [file('a.png')] });
        data.set('payload', '{nope');

        await expect(createBusinessAction(data)).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
        expect(mockControllers.ICreateBusinessController).not.toHaveBeenCalled();
    });
});
