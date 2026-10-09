import { rescheduleBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-booking.use-case';
import { SlotTakenError } from '@/src/entities/errors/booking';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

const input = { bookingId: 7, startsAt: '2026-10-02T15:00:00.000Z' };

describe('rescheduleBookingUseCase', () => {
    it('asks the repository to reschedule the Turno to the chosen horario', async () => {
        const reschedule = jest.fn().mockResolvedValue(undefined);
        await rescheduleBookingUseCase(instrumentation, userBookingsWith({ reschedule }))(input);
        expect(reschedule).toHaveBeenCalledWith(7, input.startsAt);
    });

    it('lets SlotTakenError through', async () => {
        const reschedule = jest.fn().mockRejectedValue(new SlotTakenError('taken'));
        await expect(rescheduleBookingUseCase(instrumentation, userBookingsWith({ reschedule }))(input)).rejects.toBeInstanceOf(SlotTakenError);
    });
});
