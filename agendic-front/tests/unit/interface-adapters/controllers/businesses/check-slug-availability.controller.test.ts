import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { checkSlugAvailabilityController } from '@/src/interface-adapters/controllers/businesses/check-slug-availability.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });

describe('checkSlugAvailabilityController', () => {
    it('returns what the use case answers, for the slug trimmed and in lowercase', async () => {
        const useCase = jest.fn().mockResolvedValue({ available: true });

        await expect(checkSlugAvailabilityController(instrumentation, signedIn(), useCase)('  Estudio ')).resolves.toEqual({
            available: true,
        });
        expect(useCase).toHaveBeenCalledWith('estudio');
    });

    it.each([
        ['an empty slug', '   '],
        ['a non-string slug', 3],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(checkSlugAvailabilityController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(checkSlugAvailabilityController(instrumentation, auth, useCase)('estudio')).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
