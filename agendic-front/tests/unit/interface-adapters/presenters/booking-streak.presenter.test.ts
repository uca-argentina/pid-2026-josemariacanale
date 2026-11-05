import type { BookingStreak, Prize } from '@/src/entities/models/booking-streak';
import { presentBookingStreak, prizeText } from '@/src/interface-adapters/presenters/booking-streak.presenter';

const ZONE = 'America/Argentina/Buenos_Aires';
const reward = (over = {}) => ({
    id: 7,
    requiredCount: 5,
    repeatable: false,
    type: 'GIFT' as const,
    value: null,
    description: 'Un lavado',
    service: null,
    validForDays: null,
    ...over,
});
const prize = (over: Partial<Prize> = {}): Prize => ({
    id: 3,
    type: 'GIFT',
    value: null,
    description: 'Un lavado',
    serviceName: null,
    grantedAt: '2026-10-01T12:00:00.000Z',
    expiresAt: null,
    ...over,
});
const data = (over: Partial<BookingStreak> = {}): BookingStreak => ({ streak: { count: 2, burnsAt: '2026-10-13T15:00:00.000Z' }, nextReward: null, prizes: [], ...over });

describe('prizeText', () => {
    it.each([
        ['a percentage', { type: 'PERCENT_DISCOUNT' as const, value: 10 }, '10% de descuento'],
        ['a percentage with a decimal', { type: 'PERCENT_DISCOUNT' as const, value: 12.5 }, '12,5% de descuento'],
        ['a fixed amount', { type: 'AMOUNT_DISCOUNT' as const, value: 3600 }, '$3.600 de descuento'],
        ['a fixed amount with cents', { type: 'AMOUNT_DISCOUNT' as const, value: 149.85 }, '$149,85 de descuento'],
        ['a regalo', { type: 'GIFT' as const, description: 'Un lavado de cabello' }, 'Un lavado de cabello'],
        ['a Servicio gratis', { type: 'FREE_SERVICE' as const, serviceName: 'Corte' }, 'Corte gratis'],
    ])('reads %s', (_case, over, text) => {
        expect(prizeText({ value: null, description: null, serviceName: null, ...over })).toBe(text);
    });
});

describe('presentBookingStreak', () => {
    it('says the Racha, until when it lasts and what is left to the next Recompensa', () => {
        expect(presentBookingStreak(data({ streak: { count: 5, burnsAt: '2026-10-13T15:00:00.000Z' }, nextReward: { reward: reward(), remaining: 3 } }), ZONE)).toEqual({
            streak: { title: 'Racha de 5 Turnos', until: 'Dura hasta el 13 oct' },
            nextReward: 'Faltan 3 Turnos para Un lavado',
            prizes: [],
        });
    });

    it('uses the singular for one Turno', () => {
        const presented = presentBookingStreak(data({ streak: { count: 1, burnsAt: '2026-10-13T15:00:00.000Z' }, nextReward: { reward: reward(), remaining: 1 } }), ZONE);

        expect(presented?.streak?.title).toBe('Racha de 1 Turno');
        expect(presented?.nextReward).toBe('Faltan 1 Turno para Un lavado');
    });

    it('writes the day in the zone given, not in UTC', () => {
        const late = data({ streak: { count: 2, burnsAt: '2026-10-14T01:30:00.000Z' } });

        expect(presentBookingStreak(late, ZONE)?.streak?.until).toBe('Dura hasta el 13 oct');
        expect(presentBookingStreak(late, 'UTC')?.streak?.until).toBe('Dura hasta el 14 oct');
    });

    it('lists the Premios with what they give and when they expire', () => {
        const presented = presentBookingStreak(
            data({ prizes: [prize({ expiresAt: '2026-11-02T15:00:00.000Z' }), prize({ id: 4, type: 'FREE_SERVICE', serviceName: 'Corte' })] }),
            ZONE,
        );

        expect(presented?.prizes).toEqual([
            { id: 3, text: 'Un lavado', expires: 'Vence el 2 nov' },
            { id: 4, text: 'Corte gratis', expires: null },
        ]);
    });

    it('names the Servicio gratis of the next Recompensa', () => {
        const free = reward({ type: 'FREE_SERVICE', description: null, service: { id: 9, name: 'Corte' } });

        expect(presentBookingStreak(data({ nextReward: { reward: free, remaining: 2 } }), ZONE)?.nextReward).toBe('Faltan 2 Turnos para Corte gratis');
    });

    it('has no next Recompensa line when there is none left to earn', () => {
        expect(presentBookingStreak(data(), ZONE)?.nextReward).toBeNull();
    });

    it('with the program off shows only the Premios', () => {
        const presented = presentBookingStreak(data({ streak: null, nextReward: null, prizes: [prize()] }), ZONE);

        expect(presented).toEqual({ streak: null, nextReward: null, prizes: [{ id: 3, text: 'Un lavado', expires: null }] });
    });

    it('with no Racha in course but a Premio, says so', () => {
        const presented = presentBookingStreak(data({ streak: { count: 0, burnsAt: null }, nextReward: { reward: reward(), remaining: 5 }, prizes: [prize()] }), ZONE);

        expect(presented?.streak).toEqual({ title: 'Sin Racha en curso', until: null });
        expect(presented?.nextReward).toBe('Faltan 5 Turnos para Un lavado');
    });

    it.each([
        ['the program off and no Premios', data({ streak: null })],
        ['no Racha in course and no Premios', data({ streak: { count: 0, burnsAt: null }, nextReward: { reward: reward(), remaining: 5 } })],
    ])('is null with %s: there is nothing to show', (_case, input) => {
        expect(presentBookingStreak(input, ZONE)).toBeNull();
    });
});
