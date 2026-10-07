import { cancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import { BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('cancelBookingByLinkUseCase', () => {
    it('asks the repository to cancel the Turno of the link', async () => {
        const cancelled = { id: 7 };
        const cancelBookingByLink = jest.fn().mockResolvedValue(cancelled);
        const result = await cancelBookingByLinkUseCase(instrumentation, clientBookingsWith({ cancelBookingByLink }))({ link: 's3cr3t-l1nk' });
        expect(cancelBookingByLink).toHaveBeenCalledWith('s3cr3t-l1nk');
        expect(result).toBe(cancelled);
    });

    it('lets NotFoundError through', async () => {
        const cancelBookingByLink = jest.fn().mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(
            cancelBookingByLinkUseCase(instrumentation, clientBookingsWith({ cancelBookingByLink }))({ link: 'unknown' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets BookingStateError through', async () => {
        const cancelBookingByLink = jest.fn().mockRejectedValue(new BookingStateError('Turno 7 already started'));
        await expect(
            cancelBookingByLinkUseCase(instrumentation, clientBookingsWith({ cancelBookingByLink }))({ link: 's3cr3t-l1nk' }),
        ).rejects.toBeInstanceOf(BookingStateError);
    });
});
