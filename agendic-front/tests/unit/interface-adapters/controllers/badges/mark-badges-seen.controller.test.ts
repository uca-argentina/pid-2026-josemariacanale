import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { markBadgesSeenController } from '@/src/interface-adapters/controllers/badges/mark-badges-seen.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

describe('markBadgesSeenController', () => {
    it('marks the Niveles of the Usuario as seen', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });

        await expect(markBadgesSeenController(instrumentation, auth, useCase)()).resolves.toBeUndefined();
        expect(useCase).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(markBadgesSeenController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
