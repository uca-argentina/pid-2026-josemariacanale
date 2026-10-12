import { listAnalyticsBusinessesController } from '@/src/interface-adapters/controllers/analytics/list-analytics-businesses.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { authWith, instrumentation } from '@/tests/unit/stubs';

describe('listAnalyticsBusinessesController', () => {
    it('lists the Negocios as the use case returns them, the own one first', async () => {
        const list = [
            { id: 1, name: 'Spa', isOwner: true },
            { id: 2, name: 'Gym', isOwner: false },
        ];
        const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });

        await expect(listAnalyticsBusinessesController(instrumentation, signedIn, jest.fn().mockResolvedValue(list))()).resolves.toEqual(list);
    });

    it('requires a Sesión', async () => {
        const use = jest.fn();
        const noSession = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(listAnalyticsBusinessesController(instrumentation, noSession, use)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(use).not.toHaveBeenCalled();
    });
});
