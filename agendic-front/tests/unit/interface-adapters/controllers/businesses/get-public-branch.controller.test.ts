import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { getPublicBranchController } from '@/src/interface-adapters/controllers/businesses/get-public-branch.controller';
import { instrumentation } from '@/tests/unit/stubs';

const TZ = 'America/Argentina/Buenos_Aires';

describe('getPublicBranchController', () => {
    it('presents only what the page of the Sucursal shows', async () => {
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const palermo = { id: 11, businessId: 1, name: 'Palermo', address: 'Thames 1', opensAt: '10:00', closesAt: '19:00', timeZone: TZ, slug: 'palermo' };
        const ana = { id: 1, name: 'Ana' };
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 },
            branch: centro,
            branches: [centro, palermo],
            services: [
                { id: 100, branchId: 10, name: 'Masaje', description: null, category: 'SPA', durationMinutes: 60, price: 20000, depositPercent: 20, employees: [ana] },
            ],
            employees: [ana],
            images: [
                { id: 5, branchId: 10, url: 'https://img.example/b.jpg', order: 0 },
                { id: 4, branchId: 10, url: 'https://img.example/a.jpg', order: 1 },
            ],
        });

        await expect(
            getPublicBranchController(instrumentation, useCase)({ businessSlug: 'vitalia', branchSlug: 'centro' }),
        ).resolves.toEqual({
            business: { name: 'Vitalia', description: 'Desc', slug: 'vitalia' },
            branch: { id: 10, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' },
            otherBranches: [{ id: 11, name: 'Palermo', address: 'Thames 1', slug: 'palermo' }],
            services: [
                { id: 100, name: 'Masaje', description: null, category: 'SPA', durationMinutes: 60, price: 20000, depositPercent: 20, employees: [ana] },
            ],
            employees: [ana],
            images: [
                { id: 5, url: 'https://img.example/b.jpg' },
                { id: 4, url: 'https://img.example/a.jpg' },
            ],
        });
        expect(useCase).toHaveBeenCalledWith({ businessSlug: 'vitalia', branchSlug: 'centro' });
    });

    it('presents a Sucursal without Imágenes as an empty list', async () => {
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 },
            branch: centro,
            branches: [centro],
            services: [],
            employees: [],
            images: [],
        });

        await expect(
            getPublicBranchController(instrumentation, useCase)({ businessSlug: 'vitalia', branchSlug: 'centro' }),
        ).resolves.toMatchObject({ images: [] });
    });

    it('lowercases both tramos', async () => {
        const centro = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00', timeZone: TZ, slug: 'centro' };
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 },
            branch: centro,
            branches: [centro],
            services: [],
            employees: [],
            images: [],
        });

        await getPublicBranchController(instrumentation, useCase)({ businessSlug: 'VITALIA', branchSlug: 'Centro' });
        expect(useCase).toHaveBeenCalledWith({ businessSlug: 'vitalia', branchSlug: 'centro' });
    });

    it.each([
        ['Negocio tramo missing', { branchSlug: 'centro' }],
        ['Negocio tramo malformed', { businessSlug: 'vita lia', branchSlug: 'centro' }],
        ['Sucursal tramo missing', { businessSlug: 'vitalia' }],
        ['Sucursal tramo too short', { businessSlug: 'vitalia', branchSlug: 'ce' }],
        ['Sucursal tramo malformed', { businessSlug: 'vitalia', branchSlug: 'centro--sur' }],
    ])('throws InputParseError with the %s, without calling the use case', async (_case, input) => {
        const useCase = jest.fn();

        await expect(getPublicBranchController(instrumentation, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('propagates NotFoundError from the use case', async () => {
        const useCase = jest.fn().mockRejectedValue(new NotFoundError('Branch not found'));

        await expect(
            getPublicBranchController(instrumentation, useCase)({ businessSlug: 'vitalia', branchSlug: 'palermo' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
