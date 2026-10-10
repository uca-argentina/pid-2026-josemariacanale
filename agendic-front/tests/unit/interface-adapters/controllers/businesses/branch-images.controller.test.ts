import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { deleteBranchImageController } from '@/src/interface-adapters/controllers/businesses/delete-branch-image.controller';
import { reorderBranchImagesController } from '@/src/interface-adapters/controllers/businesses/reorder-branch-images.controller';
import { uploadBranchImageController } from '@/src/interface-adapters/controllers/businesses/upload-branch-image.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'a@a.com' }) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });
const file = new File(['x'], 'a.png', { type: 'image/png' });

describe('Imágenes de Sucursal controllers', () => {
    it('upload passes the Sucursal and the file to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 1 });

        await uploadBranchImageController(instrumentation, signedIn(), useCase)({ branchId: 3, file });
        expect(useCase).toHaveBeenCalledWith(3, file);
    });

    it('delete passes the Sucursal and the image to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await deleteBranchImageController(instrumentation, signedIn(), useCase)({ branchId: 3, imageId: 1 });
        expect(useCase).toHaveBeenCalledWith(3, 1);
    });

    it('reorder passes the new order to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue([]);

        await reorderBranchImagesController(instrumentation, signedIn(), useCase)({ branchId: 3, imageIds: [2, 1] });
        expect(useCase).toHaveBeenCalledWith(3, [2, 1]);
    });

    it.each([
        ['upload without a file', uploadBranchImageController, { branchId: 3 }],
        ['delete without an image', deleteBranchImageController, { branchId: 3 }],
        ['reorder with non-numeric ids', reorderBranchImagesController, { branchId: 3, imageIds: ['a'] }],
    ])('throws InputParseError for %s', async (_case, controller, bad) => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(
            deleteBranchImageController(instrumentation, signedOut(), useCase)({ branchId: 3, imageId: 1 }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
