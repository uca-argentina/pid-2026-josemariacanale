import { getBookingStreakUseCase } from '@/src/application/use-cases/bookings/get-booking-streak.use-case';
import { redeemPrizeUseCase } from '@/src/application/use-cases/bookings/redeem-prize.use-case';
import { BookingNotAllowedError, BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { PrizeAlreadyRedeemedError, PrizeExpiredError, PrizeOfAnotherClientError } from '@/src/entities/errors/streak';
import { instrumentation, userBookingsWith } from '@/tests/unit/stubs';

const streak = { streak: { count: 2, burnsAt: null }, nextReward: null, prizes: [] };
const redeemed = {
    id: 3,
    type: 'GIFT' as const,
    value: null,
    description: 'Un lavado',
    serviceName: null,
    grantedAt: '2026-10-01T12:00:00.000Z',
    expiresAt: null,
    redeemedAt: '2026-10-05T12:00:00.000Z',
};

describe('getBookingStreakUseCase', () => {
    it('asks for the Racha of the Turno', async () => {
        const getStreak = jest.fn().mockResolvedValue(streak);

        await expect(getBookingStreakUseCase(instrumentation, userBookingsWith({ getStreak }))(7)).resolves.toEqual(streak);
        expect(getStreak).toHaveBeenCalledWith(7);
    });

    it.each([new BookingNotAllowedError('x'), new NotFoundError('x')])('lets %p through', async (error) => {
        const repo = userBookingsWith({ getStreak: jest.fn().mockRejectedValue(error) });

        await expect(getBookingStreakUseCase(instrumentation, repo)(7)).rejects.toBe(error);
    });
});

describe('redeemPrizeUseCase', () => {
    it('redeems the Premio in the Turno', async () => {
        const redeemPrize = jest.fn().mockResolvedValue(redeemed);

        await expect(redeemPrizeUseCase(instrumentation, userBookingsWith({ redeemPrize }))(7, 3)).resolves.toEqual(redeemed);
        expect(redeemPrize).toHaveBeenCalledWith(7, 3);
    });

    it.each([
        new BookingNotAllowedError('x'),
        new NotFoundError('x'),
        new PrizeAlreadyRedeemedError('x'),
        new PrizeExpiredError('x'),
        new PrizeOfAnotherClientError('x'),
        new BookingStateError('x'),
    ])('lets %p through', async (error) => {
        const repo = userBookingsWith({ redeemPrize: jest.fn().mockRejectedValue(error) });

        await expect(redeemPrizeUseCase(instrumentation, repo)(7, 3)).rejects.toBe(error);
    });
});
