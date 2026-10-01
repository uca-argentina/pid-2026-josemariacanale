import { verifyBookingUseCase } from '@/src/application/use-cases/bookings/verify-booking.use-case';
import { BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('verifyBookingUseCase', () => {
    const booking = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'BOOKED' as const,
        notes: null,
    };

    it('verifies the Turno with the token and returns the state the back left it in', async () => {
        const verifyBooking = jest.fn().mockResolvedValue(booking);

        await expect(verifyBookingUseCase(instrumentation, bookingsWith({ verifyBooking }))('abc')).resolves.toEqual(booking);
        expect(verifyBooking).toHaveBeenCalledWith('abc');
    });

    it.each([
        ['BookingStateError', new BookingStateError('Unknown, used or expired verification token')],
        ['SlotTakenError', new SlotTakenError('Overlaps a booked Turno for this Employee')],
    ])('lets %s through', async (_name, error) => {
        const verifyBooking = jest.fn().mockRejectedValue(error);
        await expect(verifyBookingUseCase(instrumentation, bookingsWith({ verifyBooking }))('abc')).rejects.toBe(error);
    });
});
