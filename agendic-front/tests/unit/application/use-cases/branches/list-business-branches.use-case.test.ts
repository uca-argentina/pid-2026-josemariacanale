import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import { listBusinessBranchesUseCase } from '@/src/application/use-cases/branches/list-business-branches.use-case';
import { instrumentation } from '@/tests/unit/stubs';

describe('listBusinessBranchesUseCase', () => {
    it('returns the Sucursales of the Negocio from the public repository', async () => {
        const branch = { id: 3, businessId: 1, name: 'Centro', address: 'Calle 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro' };
        const listBranches = jest.fn().mockResolvedValue([branch]);
        const repo = { listBranches } as unknown as IPublicBusinessesRepository;

        await expect(listBusinessBranchesUseCase(instrumentation, repo)(1)).resolves.toEqual([branch]);
        expect(listBranches).toHaveBeenCalledWith(1);
    });
});
