import { InputParseError } from '@/src/entities/errors/common';
import { getUserPageController } from '@/src/interface-adapters/controllers/users/get-user-page.controller';
import { instrumentation } from '@/tests/unit/stubs';

const service = (id: number, slug: string) => ({
    id,
    slug,
    name: `Servicio ${id}`,
    description: null,
    category: 'ACADEMIA',
    durationMinutes: 45,
    price: 5000,
    depositPercent: 10,
    requiresApproval: false,
    hidden: false,
    prepMinutes: 0,
    dailyLimit: null,
    slotInterval: null,
    minimumNoticeMinutes: 0,
    availabilityId: 7,
});
const shown = (id: number) => ({
    id,
    name: `Servicio ${id}`,
    description: null,
    category: 'ACADEMIA',
    durationMinutes: 45,
    price: 5000,
    depositPercent: 10,
});

describe('getUserPageController', () => {
    it('presents the Usuario and their Servicios as the booking flow shows them, with the chosen one', async () => {
        const useCase = jest.fn().mockResolvedValue({
            name: 'Ana',
            slug: 'ana',
            services: [service(1, 'clase')],
            selectedService: service(2, 'oculta'),
        });

        await expect(getUserPageController(instrumentation, useCase)({ userSlug: 'Ana', serviceSlug: 'oculta' })).resolves.toEqual({
            user: { name: 'Ana', slug: 'ana' },
            services: [shown(1)],
            selectedService: shown(2),
        });
        expect(useCase).toHaveBeenCalledWith({ userSlug: 'ana', serviceSlug: 'oculta' });
    });

    it.each([
        ['a Usuario tramo that is not a slug', { userSlug: 'a b' }],
        ['a Servicio tramo that is not a slug', { userSlug: 'ana', serviceSlug: '-x' }],
        ['no Usuario tramo', {}],
    ])('throws InputParseError for %s, without calling the use case', async (_case, input) => {
        const useCase = jest.fn();

        await expect(getUserPageController(instrumentation, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
