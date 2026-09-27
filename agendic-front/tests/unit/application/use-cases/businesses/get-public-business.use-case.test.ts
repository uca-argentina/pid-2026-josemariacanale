import { getPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };
const branch = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' };
const service = {
    id: 100,
    branchId: 10,
    name: 'Corte',
    description: 'Corte de pelo',
    category: 'SPA' as const,
    durationMinutes: 30,
    price: 1500,
    employees: [{ id: 1, name: 'Juan' }],
};

describe('getPublicBusinessUseCase', () => {
    it('returns business, branches, and services', async () => {
        const repo = {
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([branch]),
            listServices: jest.fn().mockResolvedValue([service]),
        };

        const result = await getPublicBusinessUseCase(instrumentation, repo)('estudio');

        expect(repo.getBusinessBySlug).toHaveBeenCalledWith('estudio');
        expect(repo.listBranches).toHaveBeenCalledWith(1);
        expect(repo.listServices).toHaveBeenCalledWith(10);
        expect(result).toEqual({
            business,
            branches: [branch],
            services: [service],
        });
    });

    it('normalizes the slug before querying repository', async () => {
        const repo = {
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([]),
            listServices: jest.fn().mockResolvedValue([]),
        };

        await getPublicBusinessUseCase(instrumentation, repo)('  ESTUDIO  ');

        expect(repo.getBusinessBySlug).toHaveBeenCalledWith('estudio');
    });

    it('propagates NotFoundError if business does not exist', async () => {
        const repo = {
            getBusinessBySlug: jest.fn().mockRejectedValue(new NotFoundError('Not found')),
            listBranches: jest.fn(),
            listServices: jest.fn(),
        };

        await expect(getPublicBusinessUseCase(instrumentation, repo)('inexistente')).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.listBranches).not.toHaveBeenCalled();
    });
});
