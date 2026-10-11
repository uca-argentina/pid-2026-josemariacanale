import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { getMyPreferencesController } from '@/src/interface-adapters/controllers/users/get-my-preferences.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

describe('getMyPreferencesController', () => {
    it('answers just the preferences of the Usuario', async () => {
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });
        const useCase = jest.fn().mockResolvedValue({ name: 'Ana', slug: null, imageUrl: null, timeFormat: 24, weekStart: 1 });

        await expect(getMyPreferencesController(instrumentation, auth, useCase)()).resolves.toEqual({ timeFormat: 24, weekStart: 1 });
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(getMyPreferencesController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
