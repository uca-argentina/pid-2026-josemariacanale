import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { listMyBusinessesUseCase } from '@/src/application/use-cases/businesses/list-my-businesses.use-case';
import { imagesStub, instrumentation } from '@/tests/unit/stubs';

describe('listMyBusinessesUseCase', () => {
    it('returns the Negocios of the Usuario from the repository, in its order', async () => {
        const mine = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, role: 'owner' as const, branchIds: [1, 2] };
        const other = { id: 2, name: 'Spa', description: 'Desc', slug: 'spa', logoUrl: null, role: 'employee' as const, branchIds: [] };
        const repo: IBusinessesRepository = {
            ...imagesStub,
            listBusinesses: jest.fn(),
            createBusiness: jest.fn(),
            updateBusiness: jest.fn(),
            listMyBusinesses: jest.fn().mockResolvedValue([mine, other]),
        };

        await expect(listMyBusinessesUseCase(instrumentation, repo)()).resolves.toEqual([mine, other]);
    });
});
