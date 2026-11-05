import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listUnseenBadgesController } from '@/src/interface-adapters/controllers/badges/list-unseen-badges.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });

describe('listUnseenBadgesController', () => {
    it('answers only the whitelisted fields, in the order the use case gave', async () => {
        const useCase = jest.fn().mockResolvedValue([
            { badge: 'attended', name: 'Turnos atendidos', level: 'bronze', earnedAt: '2026-09-01T10:00:00.000Z', extra: 'x' },
            { badge: 'five-stars', name: 'Cinco estrellas', level: 'gold', earnedAt: '2026-10-01T10:00:00.000Z', extra: 'x' },
        ]);

        await expect(listUnseenBadgesController(instrumentation, signedIn(), useCase)()).resolves.toEqual([
            { badge: 'attended', name: 'Turnos atendidos', level: 'bronze', earnedAt: '2026-09-01T10:00:00.000Z' },
            { badge: 'five-stars', name: 'Cinco estrellas', level: 'gold', earnedAt: '2026-10-01T10:00:00.000Z' },
        ]);
    });

    it('answers an empty list when nothing is unseen', async () => {
        const useCase = jest.fn().mockResolvedValue([]);

        await expect(listUnseenBadgesController(instrumentation, signedIn(), useCase)()).resolves.toEqual([]);
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listUnseenBadgesController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
