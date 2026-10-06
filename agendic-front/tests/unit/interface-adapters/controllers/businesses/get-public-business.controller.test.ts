import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { getPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import { instrumentation } from '@/tests/unit/stubs';

const TZ = 'America/Argentina/Buenos_Aires';

describe('getPublicBusinessController', () => {
    it('presents the Negocio and the tramo of each Sucursal, and nothing of the Dueño', async () => {
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 },
            branches: [{ id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: TZ, slug: 'centro' }],
        });

        await expect(getPublicBusinessController(instrumentation, useCase)({ businessSlug: 'vitalia' })).resolves.toEqual({
            business: { name: 'Vitalia', description: 'Desc', slug: 'vitalia' },
            branches: [{ id: 10, name: 'Centro', address: 'Av. 1', slug: 'centro' }],
        });
        expect(useCase).toHaveBeenCalledWith({ businessSlug: 'vitalia' });
    });

    it('lowercases the tramo, since nobody copies a link that carefully', async () => {
        const useCase = jest.fn().mockResolvedValue({
            business: { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 },
            branches: [],
        });

        await getPublicBusinessController(instrumentation, useCase)({ businessSlug: 'Vitalia' });
        expect(useCase).toHaveBeenCalledWith({ businessSlug: 'vitalia' });
    });

    it.each([
        ['missing', undefined],
        ['too short', 'ab'],
        ['with spaces', 'vita lia'],
        ['with accents', 'barbería'],
    ])('throws InputParseError on a %s tramo without calling the use case', async (_case, businessSlug) => {
        const useCase = jest.fn();

        await expect(getPublicBusinessController(instrumentation, useCase)({ businessSlug })).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('propagates NotFoundError from the use case', async () => {
        const useCase = jest.fn().mockRejectedValue(new NotFoundError('Business not found'));

        await expect(getPublicBusinessController(instrumentation, useCase)({ businessSlug: 'nadie' })).rejects.toBeInstanceOf(NotFoundError);
    });
});
