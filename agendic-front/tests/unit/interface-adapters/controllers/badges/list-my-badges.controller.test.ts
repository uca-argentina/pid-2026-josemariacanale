import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyBadgesController } from '@/src/interface-adapters/controllers/badges/list-my-badges.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@x.com' }) });

describe('listMyBadgesController', () => {
    it('answers only the whitelisted fields of each Insignia', async () => {
        const useCase = jest.fn().mockResolvedValue([
            {
                badge: 'attended',
                name: 'Turnos atendidos',
                level: 'silver',
                progress: { current: 73, target: 100, extra: 'x' },
                levels: [{ level: 'silver', target: 50, earnedAt: '2026-10-01T10:00:00.000Z', extra: 'x' }],
                extra: 'x',
            },
        ]);

        await expect(listMyBadgesController(instrumentation, signedIn(), useCase)()).resolves.toEqual([
            {
                badge: 'attended',
                name: 'Turnos atendidos',
                level: 'silver',
                progress: { current: 73, target: 100 },
                levels: [{ level: 'silver', target: 50, earnedAt: '2026-10-01T10:00:00.000Z' }],
            },
        ]);
    });

    it('keeps a null progress when the last Nivel is won', async () => {
        const useCase = jest.fn().mockResolvedValue([
            { badge: 'first-booking', name: 'Primer Turno', level: 'bronze', progress: null, levels: [] },
        ]);

        const [badge] = await listMyBadgesController(instrumentation, signedIn(), useCase)();

        expect(badge.progress).toBeNull();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyBadgesController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
