import type { ClientStreak } from '@/src/entities/models/booking-streak';
import { presentClientStreak } from '@/src/interface-adapters/presenters/booking-streak.presenter';

const ZONE = 'America/Argentina/Buenos_Aires';
const reward = (over = {}) => ({
    id: 7,
    requiredCount: 5,
    repeatable: false,
    type: 'PERCENT_DISCOUNT' as const,
    value: 20,
    description: null,
    service: null,
    validForDays: null,
    ...over,
});
const prize = (over = {}) => ({
    id: 3,
    type: 'GIFT' as const,
    value: null,
    description: 'Un lavado',
    serviceName: null,
    grantedAt: '2026-10-01T12:00:00.000Z',
    expiresAt: null,
    ...over,
});
const streak = (over: Partial<ClientStreak> = {}): ClientStreak => ({
    count: 3,
    burnsAt: '2026-12-13T01:30:00.000Z',
    nextReward: { reward: reward(), remaining: 2 },
    prizes: [],
    ...over,
});

describe('presentClientStreak', () => {
    it('is null without a Racha: the block does not show', () => {
        expect(presentClientStreak(null, ZONE)).toBeNull();
    });

    it('says the Turnos, the progress, what is left and until when to come back', () => {
        expect(presentClientStreak(streak(), ZONE)).toEqual({
            title: '3 Turnos',
            progress: { done: 3, total: 5 },
            nextReward: 'Te faltan 2 Turnos para 20% de descuento',
            returnBy: 'Volvé antes del 12/12',
            prizes: [],
        });
    });

    it('writes the day in the zone of the Turno, not in UTC', () => {
        const late = streak({ burnsAt: '2026-12-13T01:30:00.000Z' });

        expect(presentClientStreak(late, ZONE)?.returnBy).toBe('Volvé antes del 12/12');
        expect(presentClientStreak(late, 'UTC')?.returnBy).toBe('Volvé antes del 13/12');
    });

    it('uses the singular for one Turno and for one that is left', () => {
        const presented = presentClientStreak(streak({ count: 1, nextReward: { reward: reward(), remaining: 1 } }), ZONE);

        expect(presented?.title).toBe('1 Turno');
        expect(presented?.nextReward).toBe('Te falta 1 Turno para 20% de descuento');
    });

    it('in a repeatable Recompensa, the progress is inside the lap in course', () => {
        // Every 5 Turnos, with 7: the next is the 10th, 3 away, and the bar is at 2 of 5.
        const presented = presentClientStreak(streak({ count: 7, nextReward: { reward: reward({ repeatable: true }), remaining: 3 } }), ZONE);

        expect(presented?.progress).toEqual({ done: 2, total: 5 });
    });

    it('without a next Recompensa there is no progress bar and no line about it', () => {
        const presented = presentClientStreak(streak({ nextReward: null }), ZONE);

        expect(presented).toMatchObject({ progress: null, nextReward: null });
    });

    it('names the Servicio gratis of the next Recompensa', () => {
        const free = reward({ type: 'FREE_SERVICE', value: null, service: { id: 9, name: 'Corte' } });

        expect(presentClientStreak(streak({ nextReward: { reward: free, remaining: 2 } }), ZONE)?.nextReward).toBe(
            'Te faltan 2 Turnos para Corte gratis',
        );
    });

    it('without a Racha in course there is nothing to come back before', () => {
        expect(presentClientStreak(streak({ count: 0, burnsAt: null, prizes: [prize()] }), ZONE)).toMatchObject({
            title: '0 Turnos',
            returnBy: null,
        });
    });

    it('lists the Premios with what they give and when they expire', () => {
        const presented = presentClientStreak(
            streak({ prizes: [prize({ expiresAt: '2026-11-30T15:00:00.000Z' }), prize({ id: 4, type: 'FREE_SERVICE', serviceName: 'Corte' })] }),
            ZONE,
        );

        expect(presented?.prizes).toEqual([
            { id: 3, text: 'Un lavado', expires: 'Vence el 30/11' },
            { id: 4, text: 'Corte gratis', expires: null },
        ]);
    });
});
