import { getPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, publicBusinessesWith } from '@/tests/unit/stubs';

const TZ = 'America/Argentina/Buenos_Aires';

describe('getPublicBranchUseCase', () => {
    it('returns the Negocio, the Sucursal of the URL, every Sucursal, its Servicios and its Empleados without duplicates', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const palermo = { id: 11, businessId: 1, name: 'Palermo', address: 'Thames 1', opensAt: '10:00', closesAt: '19:00', timeZone: TZ, slug: 'palermo' };
        const ana = { id: 1, name: 'Ana' };
        const beto = { id: 2, name: 'Beto' };
        const services = [
            { id: 100, branchId: 11, name: 'Masaje', description: null, category: 'SPA' as const, durationMinutes: 60, price: 20000, depositPercent: 20, employees: [ana, beto] },
            { id: 101, branchId: 11, name: 'Facial', description: 'Limpieza', category: 'SPA' as const, durationMinutes: 45, price: 15000, depositPercent: null, employees: [beto] },
        ];
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro, palermo]),
            listServices: jest.fn().mockResolvedValue(services),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'palermo' }),
        ).resolves.toEqual({ business, branch: palermo, branches: [centro, palermo], services, employees: [ana, beto] });
        expect(repo.getBusinessBySlug).toHaveBeenCalledWith('vitalia');
        expect(repo.listBranches).toHaveBeenCalledWith(1);
        expect(repo.listServices).toHaveBeenCalledWith(11);
    });

    it('returns a Sucursal without Servicios and so without Empleados', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
            listServices: jest.fn().mockResolvedValue([]),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'centro' }),
        ).resolves.toMatchObject({ branch: centro, services: [], employees: [] });
    });

    it('propagates NotFoundError when no Negocio has that Enlace de reserva', async () => {
        const repo = publicBusinessesWith({ getBusinessBySlug: jest.fn().mockRejectedValue(new NotFoundError('Business not found')) });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'nadie', branchSlug: 'centro' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.listBranches).not.toHaveBeenCalled();
    });

    // A Sucursal of another Negocio never shows up in this Negocio's list, so it is the same case.
    it('throws NotFoundError when the Negocio has no Sucursal with that tramo', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'palermo' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.listServices).not.toHaveBeenCalled();
    });
});
