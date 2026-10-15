import { getBookingHistoryUseCase } from '@/src/application/use-cases/bookings/get-booking-history.use-case';
import { BookingNotAllowedError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('getBookingHistoryUseCase', () => {
    it('returns the Historial del Turno from the repository', async () => {
        const entries = [{ type: 'booked', at: '2026-10-12T13:03:00.000Z', actor: 'client', reason: null, from: null }];
        const getHistory = jest.fn().mockResolvedValue(entries);
        await expect(getBookingHistoryUseCase(instrumentation, userBookingsWith({ getHistory }))(7)).resolves.toEqual(entries);
        expect(getHistory).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const getHistory = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(getBookingHistoryUseCase(instrumentation, userBookingsWith({ getHistory }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets BookingNotAllowedError through', async () => {
        const getHistory = jest.fn().mockRejectedValue(new BookingNotAllowedError('no'));
        await expect(getBookingHistoryUseCase(instrumentation, userBookingsWith({ getHistory }))(7)).rejects.toBeInstanceOf(BookingNotAllowedError);
    });
});
