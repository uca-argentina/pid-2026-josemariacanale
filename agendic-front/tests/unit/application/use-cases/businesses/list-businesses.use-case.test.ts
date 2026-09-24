import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { listBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import { instrumentation } from '@/tests/unit/stubs';

describe('listBusinessesUseCase', () => {
    it('returns the Negocios from the repository', async () => {
        const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };
        const repo: IBusinessesRepository = { listBusinesses: jest.fn().mockResolvedValue([business]), createBusiness: jest.fn() };

        await expect(listBusinessesUseCase(instrumentation, repo)()).resolves.toEqual([business]);
    });
});
