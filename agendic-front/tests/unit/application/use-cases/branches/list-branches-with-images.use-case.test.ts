import { listBranchesWithImagesUseCase } from '@/src/application/use-cases/branches/list-branches-with-images.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation, publicBusinessesWith } from '@/tests/unit/stubs';

const tz = 'America/Argentina/Buenos_Aires';
const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: tz, slug: 'centro', description: null };
const norte = { ...centro, id: 11, name: 'Norte', slug: 'norte', description: 'La del norte' };

describe('listBranchesWithImagesUseCase', () => {
    it('pairs each Sucursal with its Imágenes, sorted by order', async () => {
        const second = { id: 2, branchId: 10, url: 'b.jpg', order: 5 };
        const first = { id: 1, branchId: 10, url: 'a.jpg', order: 1 };
        const listBranches = jest.fn().mockResolvedValue([centro, norte]);
        const repo = publicBusinessesWith({
            listBranches,
            listBranchImages: jest.fn(async (branchId: number) => (branchId === 10 ? [second, first] : [])),
        });

        await expect(listBranchesWithImagesUseCase(instrumentation, repo)(1)).resolves.toEqual([
            { branch: centro, images: [first, second] },
            { branch: norte, images: [] },
        ]);
        expect(listBranches).toHaveBeenCalledWith(1);
    });

    it('lets ApiRequestError through', async () => {
        const repo = publicBusinessesWith({ listBranches: jest.fn().mockRejectedValue(new ApiRequestError('boom')) });

        await expect(listBranchesWithImagesUseCase(instrumentation, repo)(1)).rejects.toBeInstanceOf(ApiRequestError);
    });
});
