import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { updateServiceController } from '@/src/interface-adapters/controllers/services/update-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const updated = { id: 100, name: 'Masaje', slug: 'masaje', hidden: true, price: 20000 };
const input = {
    id: 100,
    name: 'Masaje',
    slug: 'masaje',
    description: 'Relajante',
    category: 'SPA',
    durationMinutes: 60,
    price: 20000,
    depositPercent: 20,
    requiresApproval: true,
    hidden: true,
    prepMinutes: 10,
    dailyLimit: 8,
};

describe('updateServiceController', () => {
    it('updates the Servicio and presents its id, name, tramo and whether it is hidden', async () => {
        const useCase = jest.fn().mockResolvedValue(updated);

        await expect(updateServiceController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            id: 100,
            name: 'Masaje',
            slug: 'masaje',
            hidden: true,
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it('sends only the fields given, so hiding the Servicio does not touch the rest', async () => {
        const useCase = jest.fn().mockResolvedValue(updated);

        await updateServiceController(instrumentation, signedIn(), useCase)({ id: 100, hidden: true });
        expect(useCase).toHaveBeenCalledWith({ id: 100, hidden: true });
    });

    it('keeps depositPercent null, which drops the Seña, and lowercases the tramo', async () => {
        const useCase = jest.fn().mockResolvedValue(updated);

        await updateServiceController(instrumentation, signedIn(), useCase)({ id: 100, depositPercent: null, slug: 'Masaje' });
        expect(useCase).toHaveBeenCalledWith({ id: 100, depositPercent: null, slug: 'masaje' });
    });

    it('keeps dailyLimit null, which drops the Límite diario', async () => {
        const useCase = jest.fn().mockResolvedValue(updated);

        await updateServiceController(instrumentation, signedIn(), useCase)({ id: 100, prepMinutes: 0, dailyLimit: null });
        expect(useCase).toHaveBeenCalledWith({ id: 100, prepMinutes: 0, dailyLimit: null });
    });

    it.each([
        ['a missing id', { ...input, id: undefined }],
        ['a blank name', { ...input, name: ' ' }],
        ['a tramo too short', { ...input, slug: 'ma' }],
        ['a malformed tramo', { ...input, slug: 'masaje relajante' }],
        ['a blank description', { ...input, description: ' ' }],
        ['a category off the list', { ...input, category: 'PELUQUERIA' }],
        ['a zero duration', { ...input, durationMinutes: 0 }],
        ['a negative price', { ...input, price: -1 }],
        ['a Seña over 100%', { ...input, depositPercent: 101 }],
        ['a fractional Seña', { ...input, depositPercent: 12.5 }],
        ['a Aprobación manual that is not a boolean', { ...input, requiresApproval: 'yes' }],
        ['a hidden that is not a boolean', { ...input, hidden: 'yes' }],
        ['a Tiempo de preparación off the list', { ...input, prepMinutes: 20 }],
        ['a Límite diario of zero', { ...input, dailyLimit: 0 }],
        ['a fractional Límite diario', { ...input, dailyLimit: 2.5 }],
        ['no input', undefined],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(updateServiceController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(updateServiceController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
