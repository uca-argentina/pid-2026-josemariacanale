import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { deleteBranchImageUseCase } from '@/src/application/use-cases/businesses/delete-branch-image.use-case';
import { reorderBranchImagesUseCase } from '@/src/application/use-cases/businesses/reorder-branch-images.use-case';
import { uploadBranchImageUseCase } from '@/src/application/use-cases/businesses/upload-branch-image.use-case';
import { BranchImageLimitError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const image = { id: 1, branchId: 3, url: 'https://img/1.png', order: 0 };
const repoWith = (stubs: Partial<IBusinessesRepository>) => stubs as IBusinessesRepository;

describe('Imágenes de Sucursal use cases', () => {
    it('uploads through the repository', async () => {
        const file = new File(['x'], 'a.png', { type: 'image/png' });
        const uploadBranchImage = jest.fn().mockResolvedValue(image);

        await expect(uploadBranchImageUseCase(instrumentation, repoWith({ uploadBranchImage }))(3, file)).resolves.toEqual(image);
        expect(uploadBranchImage).toHaveBeenCalledWith(3, file);
    });

    it('lets BranchImageLimitError through', async () => {
        const repo = repoWith({ uploadBranchImage: jest.fn().mockRejectedValue(new BranchImageLimitError('x')) });

        await expect(uploadBranchImageUseCase(instrumentation, repo)(3, new File([], 'a.png'))).rejects.toBeInstanceOf(
            BranchImageLimitError,
        );
    });

    it('deletes through the repository', async () => {
        const deleteBranchImage = jest.fn().mockResolvedValue(undefined);

        await deleteBranchImageUseCase(instrumentation, repoWith({ deleteBranchImage }))(3, 1);
        expect(deleteBranchImage).toHaveBeenCalledWith(3, 1);
    });

    it('reorders through the repository', async () => {
        const reorderBranchImages = jest.fn().mockResolvedValue([image]);

        await expect(reorderBranchImagesUseCase(instrumentation, repoWith({ reorderBranchImages }))(3, [1])).resolves.toEqual([image]);
        expect(reorderBranchImages).toHaveBeenCalledWith(3, [1]);
    });
});
