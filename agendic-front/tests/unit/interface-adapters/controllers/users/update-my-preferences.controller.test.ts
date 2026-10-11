import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { updateMyPreferencesController } from '@/src/interface-adapters/controllers/users/update-my-preferences.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });

describe('updateMyPreferencesController', () => {
    it('saves the given fields and answers just the preferences', async () => {
        const useCase = jest.fn().mockResolvedValue({ name: 'Ana', slug: null, imageUrl: null, timeFormat: 12, weekStart: 0 });

        await expect(updateMyPreferencesController(instrumentation, signedIn, useCase)({ timeFormat: 12 })).resolves.toEqual({
            timeFormat: 12,
            weekStart: 0,
        });
        expect(useCase).toHaveBeenCalledWith({ timeFormat: 12 });
    });

    it.each([{ timeFormat: 13 }, { weekStart: 7 }, { weekStart: 'x' }])('rejects %j', async (input) => {
        const useCase = jest.fn();

        await expect(updateMyPreferencesController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(updateMyPreferencesController(instrumentation, auth, useCase)({})).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
