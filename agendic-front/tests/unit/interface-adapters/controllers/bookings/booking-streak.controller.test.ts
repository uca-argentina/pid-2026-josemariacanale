import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { getBookingStreakController } from '@/src/interface-adapters/controllers/bookings/get-booking-streak.controller';
import { redeemPrizeController } from '@/src/interface-adapters/controllers/bookings/redeem-prize.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'a@a.com' }) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });
const ZONE = 'America/Argentina/Buenos_Aires';

describe('getBookingStreakController', () => {
    const prize = {
        id: 3,
        type: 'PERCENT_DISCOUNT',
        value: 10,
        description: null,
        serviceName: null,
        grantedAt: '2026-10-01T12:00:00.000Z',
        expiresAt: null,
    };

    it('presents the Racha ready to show', async () => {
        const useCase = jest.fn().mockResolvedValue({ streak: { count: 5, burnsAt: '2026-10-13T15:00:00.000Z' }, nextReward: null, prizes: [prize] });

        await expect(getBookingStreakController(instrumentation, signedIn(), useCase)({ bookingId: 7, timeZone: ZONE })).resolves.toEqual({
            streak: { title: 'Racha de 5 Turnos', until: 'Dura hasta el 13 oct' },
            nextReward: null,
            prizes: [{ id: 3, text: '10% de descuento', expires: null }],
        });
        expect(useCase).toHaveBeenCalledWith(7);
    });

    it('answers null when there is nothing to show', async () => {
        const useCase = jest.fn().mockResolvedValue({ streak: null, nextReward: null, prizes: [] });

        await expect(getBookingStreakController(instrumentation, signedIn(), useCase)({ bookingId: 7, timeZone: ZONE })).resolves.toBeNull();
    });

    it.each([
        ['no bookingId', { timeZone: ZONE }],
        ['a string bookingId', { bookingId: '7', timeZone: ZONE }],
        ['a bookingId of 0', { bookingId: 0, timeZone: ZONE }],
        ['no timeZone', { bookingId: 7 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(getBookingStreakController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(getBookingStreakController(instrumentation, signedOut(), useCase)({ bookingId: 7, timeZone: ZONE })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('redeemPrizeController', () => {
    const redeemed = {
        id: 3,
        type: 'FREE_SERVICE',
        value: null,
        description: null,
        serviceName: 'Corte',
        grantedAt: '2026-10-01T12:00:00.000Z',
        expiresAt: null,
        redeemedAt: '2026-10-05T12:00:00.000Z',
    };

    it('redeems and answers what was delivered, in words', async () => {
        const useCase = jest.fn().mockResolvedValue(redeemed);

        await expect(redeemPrizeController(instrumentation, signedIn(), useCase)({ bookingId: 7, prizeId: 3 })).resolves.toEqual({ text: 'Corte gratis' });
        expect(useCase).toHaveBeenCalledWith(7, 3);
    });

    it.each([
        ['no prizeId', { bookingId: 7 }],
        ['a string prizeId', { bookingId: 7, prizeId: '3' }],
        ['a prizeId with decimals', { bookingId: 7, prizeId: 1.5 }],
        ['no bookingId', { prizeId: 3 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(redeemPrizeController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(redeemPrizeController(instrumentation, signedOut(), useCase)({ bookingId: 7, prizeId: 3 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
