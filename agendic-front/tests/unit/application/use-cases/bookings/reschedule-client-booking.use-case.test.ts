import { rescheduleClientBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-client-booking.use-case';
import { SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('rescheduleClientBookingUseCase', () => {
    it('asks the repository to reschedule the Turno of the access to startsAt', async () => {
        const rescheduled = { id: 7, startsAt: '2026-10-11T12:00:00.000Z' };
        const reschedule = jest.fn().mockResolvedValue(rescheduled);
        const result = await rescheduleClientBookingUseCase(instrumentation, clientBookingsWith({ reschedule }))({
            access: 'signed-token',
            bookingId: 7,
            startsAt: '2026-10-11T12:00:00.000Z',
        });
        expect(reschedule).toHaveBeenCalledWith('signed-token', 7, '2026-10-11T12:00:00.000Z');
        expect(result).toBe(rescheduled);
    });

    it('lets SlotTakenError through', async () => {
        const reschedule = jest.fn().mockRejectedValue(new SlotTakenError('no'));
        await expect(
            rescheduleClientBookingUseCase(instrumentation, clientBookingsWith({ reschedule }))({
                access: 'signed-token',
                bookingId: 7,
                startsAt: '2026-10-11T12:00:00.000Z',
            }),
        ).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('lets SlotUnavailableError through', async () => {
        const reschedule = jest.fn().mockRejectedValue(new SlotUnavailableError('no'));
        await expect(
            rescheduleClientBookingUseCase(instrumentation, clientBookingsWith({ reschedule }))({
                access: 'signed-token',
                bookingId: 7,
                startsAt: '2026-10-11T12:00:00.000Z',
            }),
        ).rejects.toBeInstanceOf(SlotUnavailableError);
    });
});
