import { createBusinessAction } from '@/app/(app)/business/actions';
import { ApiRequestError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateBusinessController: jest.fn(),
    IAddEmployeeController: jest.fn(),
    IUploadBusinessLogoController: jest.fn(),
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
    it('creates the Negocio without a Servicio, then uploads the Logo and the images in order to its Sucursal', async () => {
        await expect(
            createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png'), file('b.png')] })),
        ).resolves.toEqual({ ok: true, failedEmployees: [], failedUploads: [] });

        expect(mockControllers.ICreateBusinessController).toHaveBeenCalledWith(payload);
        expect(mockControllers.IUploadBusinessLogoController).toHaveBeenCalledWith({
            businessId: 5,
            file: expect.objectContaining({ name: 'logo.png' }),
        });
        expect(mockControllers.IUploadBranchImageController.mock.calls.map(([input]) => input)).toEqual([
            { branchId: 9, file: expect.objectContaining({ name: 'a.png' }) },
            { branchId: 9, file: expect.objectContaining({ name: 'b.png' }) },
        ]);
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('uploads nothing when no Logo or images were chosen', async () => {
        await createBusinessAction(form());

        expect(mockControllers.IUploadBusinessLogoController).not.toHaveBeenCalled();
        expect(mockControllers.IUploadBranchImageController).not.toHaveBeenCalled();
    });

    it('keeps the Negocio and names the Logo when it fails to upload', async () => {
        mockControllers.IUploadBusinessLogoController.mockRejectedValue(new ApiRequestError('boom', { status: 500 }));

        await expect(createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png')] }))).resolves.toEqual({
            ok: true,
            failedEmployees: [],
            failedUploads: ['el Logo'],
        });
        expect(mockControllers.IUploadBranchImageController).toHaveBeenCalledTimes(1);
        expect(mockReport).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('names each image that fails and keeps uploading the rest', async () => {
        mockControllers.IUploadBranchImageController.mockRejectedValueOnce(new ApiRequestError('boom', { status: 500 }));

        const result = await createBusinessAction(form({ images: [file('a.png'), file('b.png'), file('c.png')] }));

        expect(result).toEqual({ ok: true, failedEmployees: [], failedUploads: ['la imagen a.png'] });
        expect(mockControllers.IUploadBranchImageController).toHaveBeenCalledTimes(3);
    });

    it('reports the Invitaciones that fail', async () => {
        mockControllers.IAddEmployeeController.mockRejectedValueOnce(new ApiRequestError('boom', { status: 500 }));

        const result = await createBusinessAction(form({ emails: ['a@a.com', 'b@b.com'] }));

        expect(result).toEqual({ ok: true, failedEmployees: ['a@a.com'], failedUploads: [] });
    });

    it('uploads nothing when the Negocio is not created', async () => {
        mockControllers.ICreateBusinessController.mockRejectedValue(new ApiRequestError('boom', { status: 500 }));

        const result = await createBusinessAction(form({ logo: file('logo.png'), images: [file('a.png')] }));

        expect(result.ok).toBe(false);
        expect(mockControllers.IUploadBusinessLogoController).not.toHaveBeenCalled();
        expect(mockControllers.IUploadBranchImageController).not.toHaveBeenCalled();
    });
});
