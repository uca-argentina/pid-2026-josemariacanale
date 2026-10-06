import { getPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, publicBusinessesWith } from '@/tests/unit/stubs';

describe('getPublicBusinessUseCase', () => {
    it('returns the Negocio with its Sucursales', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
        const branches = [
            { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro' },
        ];
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue(branches),
        });

        await expect(getPublicBusinessUseCase(instrumentation, repo)({ businessSlug: 'vitalia' })).resolves.toEqual({ business, branches });
        expect(repo.getBusinessBySlug).toHaveBeenCalledWith('vitalia');
        expect(repo.listBranches).toHaveBeenCalledWith(1);
    });

    it('returns a Negocio without Sucursales', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([]),
        });

        await expect(getPublicBusinessUseCase(instrumentation, repo)({ businessSlug: 'vitalia' })).resolves.toEqual({ business, branches: [] });
    });

    it('propagates NotFoundError when no Negocio has that Enlace de reserva', async () => {
        const repo = publicBusinessesWith({ getBusinessBySlug: jest.fn().mockRejectedValue(new NotFoundError('Business not found')) });

        await expect(getPublicBusinessUseCase(instrumentation, repo)({ businessSlug: 'nadie' })).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.listBranches).not.toHaveBeenCalled();
    });
});
