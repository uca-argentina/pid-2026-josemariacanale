import { getPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, publicBusinessesWith } from '@/tests/unit/stubs';

const TZ = 'America/Argentina/Buenos_Aires';

describe('getPublicBranchUseCase', () => {
    it('returns the Negocio, the Sucursal of the URL, every Sucursal, its Servicios, its Empleados without duplicates and its Imágenes', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const palermo = { id: 11, businessId: 1, name: 'Palermo', address: 'Thames 1', timeZone: TZ, slug: 'palermo' };
        const ana = { id: 1, name: 'Ana' };
        const beto = { id: 2, name: 'Beto' };
        const services = [
            { id: 100, branchId: 11, name: 'Masaje', description: null, category: 'SPA' as const, durationMinutes: 60, price: 20000, depositPercent: 20, employees: [ana, beto] },
            { id: 101, branchId: 11, name: 'Facial', description: 'Limpieza', category: 'SPA' as const, durationMinutes: 45, price: 15000, depositPercent: null, employees: [beto] },
        ];
        const images = [
            { id: 5, branchId: 11, url: 'https://img.example/b.jpg', order: 0 },
            { id: 4, branchId: 11, url: 'https://img.example/a.jpg', order: 1 },
        ];
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro, palermo]),
            listServices: jest.fn().mockResolvedValue(services),
            listBranchImages: jest.fn().mockResolvedValue(images),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'palermo' }),
        ).resolves.toEqual({
            business,
            branch: palermo,
            branches: [centro, palermo],
            services,
            employees: [ana, beto],
            images,
            selectedService: null,
            selectedEmployee: null,
        });
        expect(repo.getServiceBySlug).not.toHaveBeenCalled();
        expect(repo.getBusinessBySlug).toHaveBeenCalledWith('vitalia');
        expect(repo.listBranches).toHaveBeenCalledWith(1);
        expect(repo.listServices).toHaveBeenCalledWith(11);
        expect(repo.listBranchImages).toHaveBeenCalledWith(11);
    });

    it('returns a Sucursal without Servicios, and so without Empleados, and without Imágenes', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
            listServices: jest.fn().mockResolvedValue([]),
            listBranchImages: jest.fn().mockResolvedValue([]),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'centro' }),
        ).resolves.toMatchObject({ branch: centro, services: [], employees: [], images: [] });
    });

    // ADR 0007: `order` is ascending but may have gaps, and the front sorts by it.
    it('sorts the Imágenes by order', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const first = { id: 7, branchId: 10, url: 'https://img.example/a.jpg', order: 2 };
        const second = { id: 3, branchId: 10, url: 'https://img.example/b.jpg', order: 5 };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
            listServices: jest.fn().mockResolvedValue([]),
            listBranchImages: jest.fn().mockResolvedValue([second, first]),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'centro' }),
        ).resolves.toMatchObject({ images: [first, second] });
    });

    it('with a Servicio tramo, also returns that Servicio as the chosen one, even when it is hidden and so not listed', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const visible = { id: 100, branchId: 10, name: 'Masaje', description: null, category: 'SPA' as const, durationMinutes: 60, price: 20000, depositPercent: null, employees: [{ id: 1, name: 'Ana', imageUrl: null, slug: 'ana' }] };
        const hidden = { ...visible, id: 101, name: 'Masaje VIP' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
            listServices: jest.fn().mockResolvedValue([visible]),
            listBranchImages: jest.fn().mockResolvedValue([]),
            getServiceBySlug: jest.fn().mockResolvedValue(hidden),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'centro', serviceSlug: 'masaje-vip' }),
        ).resolves.toMatchObject({ services: [visible], selectedService: hidden });
        expect(repo.getServiceBySlug).toHaveBeenCalledWith(10, 'masaje-vip');
    });

    describe('with an Empleado tramo (Empleado elegido, ADR 0026)', () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const ana = { id: 1, name: 'Ana', imageUrl: null, slug: 'ana' };
        const beto = { id: 2, name: 'Beto', imageUrl: null, slug: null };
        const masaje = { id: 100, branchId: 10, name: 'Masaje', description: null, category: 'SPA' as const, durationMinutes: 60, price: 20000, depositPercent: null, employees: [ana, beto] };
        const repoWith = () =>
            publicBusinessesWith({
                getBusinessBySlug: jest.fn().mockResolvedValue(business),
                listBranches: jest.fn().mockResolvedValue([centro]),
                listServices: jest.fn().mockResolvedValue([masaje]),
                listBranchImages: jest.fn().mockResolvedValue([]),
                getServiceBySlug: jest.fn().mockResolvedValue(masaje),
            });
        const input = { businessSlug: 'vitalia', branchSlug: 'centro', serviceSlug: 'masaje' };

        it('returns the Empleado of the tramo as the chosen one', async () => {
            await expect(
                getPublicBranchUseCase(instrumentation, repoWith())({ ...input, employeeSlug: 'ana' }),
            ).resolves.toMatchObject({ selectedService: masaje, selectedEmployee: ana });
        });

        it('throws NotFoundError when no Empleado who offers the Servicio has that tramo', async () => {
            await expect(
                getPublicBranchUseCase(instrumentation, repoWith())({ ...input, employeeSlug: 'carla' }),
            ).rejects.toBeInstanceOf(NotFoundError);
        });

        it('throws NotFoundError for an Empleado tramo without a Servicio tramo', async () => {
            await expect(
                getPublicBranchUseCase(instrumentation, repoWith())({ businessSlug: 'vitalia', branchSlug: 'centro', employeeSlug: 'ana' }),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    it('propagates NotFoundError when the Sucursal has no active Servicio with that tramo', async () => {
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
            listServices: jest.fn().mockResolvedValue([]),
            listBranchImages: jest.fn().mockResolvedValue([]),
            getServiceBySlug: jest.fn().mockRejectedValue(new NotFoundError('Service not found')),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'centro', serviceSlug: 'nada' }),
        ).rejects.toBeInstanceOf(NotFoundError);
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
        const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', logoUrl: null, ownerId: 7 };
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' };
        const repo = publicBusinessesWith({
            getBusinessBySlug: jest.fn().mockResolvedValue(business),
            listBranches: jest.fn().mockResolvedValue([centro]),
        });

        await expect(
            getPublicBranchUseCase(instrumentation, repo)({ businessSlug: 'vitalia', branchSlug: 'palermo' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.listServices).not.toHaveBeenCalled();
        expect(repo.listBranchImages).not.toHaveBeenCalled();
    });
});
