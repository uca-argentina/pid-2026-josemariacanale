import { cancelClientBookingUseCase } from '@/src/application/use-cases/bookings/cancel-client-booking.use-case';
import { BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('cancelClientBookingUseCase', () => {
    it('asks the repository to cancel the Turno of the access', async () => {
        const cancelled = { id: 7 };
        const cancel = jest.fn().mockResolvedValue(cancelled);
        const result = await cancelClientBookingUseCase(instrumentation, clientBookingsWith({ cancel }))({
            access: 'signed-token',
            bookingId: 7,
        });
        expect(cancel).toHaveBeenCalledWith('signed-token', 7);
        expect(result).toBe(cancelled);
    });

    it('lets NotFoundError through', async () => {
        const cancel = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(
            cancelClientBookingUseCase(instrumentation, clientBookingsWith({ cancel }))({ access: 'signed-token', bookingId: 7 }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets BookingStateError through', async () => {
        const cancel = jest.fn().mockRejectedValue(new BookingStateError('no'));
        await expect(
            cancelClientBookingUseCase(instrumentation, clientBookingsWith({ cancel }))({ access: 'signed-token', bookingId: 7 }),
        ).rejects.toBeInstanceOf(BookingStateError);
    });
});
