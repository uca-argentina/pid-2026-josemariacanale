import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { retireMeController } from '@/src/interface-adapters/controllers/users/retire-me.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

describe('retireMeController', () => {
    it('retires the Usuario of the Sesión', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });

        await retireMeController(instrumentation, auth, useCase)();

        expect(useCase).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(retireMeController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
