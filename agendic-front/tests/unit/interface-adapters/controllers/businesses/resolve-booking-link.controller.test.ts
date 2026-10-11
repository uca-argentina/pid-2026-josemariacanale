import { InputParseError } from '@/src/entities/errors/common';
import { resolveBookingLinkController } from '@/src/interface-adapters/controllers/businesses/resolve-booking-link.controller';
import { instrumentation } from '@/tests/unit/stubs';

describe('resolveBookingLinkController', () => {
    it('presents only the public fields of a Negocio', async () => {
        const useCase = jest.fn().mockResolvedValue({
            kind: 'business',
            business: { id: 1, name: 'Luna', description: 'Peluquería', slug: 'luna', ownerId: 7, logoUrl: null },
        });

        await expect(resolveBookingLinkController(instrumentation, useCase)({ slug: 'Luna' })).resolves.toEqual({
            kind: 'business',
            business: { name: 'Luna', slug: 'luna' },
        });
        expect(useCase).toHaveBeenCalledWith({ slug: 'luna' });
    });

    it('presents only the public fields of a Usuario', async () => {
        const useCase = jest.fn().mockResolvedValue({
            kind: 'user',
            user: { name: 'Ana', slug: 'ana', imageUrl: null, services: [{ id: 1 }] },
        });

        await expect(resolveBookingLinkController(instrumentation, useCase)({ slug: 'ana' })).resolves.toEqual({
            kind: 'user',
            user: { name: 'Ana', slug: 'ana' },
        });
    });

    it.each([
        ['a tramo that is not a slug', { slug: 'a b' }],
        ['no tramo', {}],
    ])('throws InputParseError for %s, without calling the use case', async (_case, input) => {
        const useCase = jest.fn();

        await expect(resolveBookingLinkController(instrumentation, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
