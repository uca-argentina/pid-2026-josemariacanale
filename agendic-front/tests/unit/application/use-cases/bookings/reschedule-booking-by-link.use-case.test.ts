import { rescheduleBookingByLinkUseCase } from '@/src/application/use-cases/bookings/reschedule-booking-by-link.use-case';
import { SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

const input = { link: 's3cr3t-l1nk', startsAt: '2026-10-11T12:00:00.000Z' };

describe('rescheduleBookingByLinkUseCase', () => {
    it('asks the repository to reschedule the Turno of the link to startsAt', async () => {
        const rescheduled = { id: 7, startsAt: '2026-10-11T12:00:00.000Z' };
        const rescheduleBookingByLink = jest.fn().mockResolvedValue(rescheduled);
        const result = await rescheduleBookingByLinkUseCase(instrumentation, clientBookingsWith({ rescheduleBookingByLink }))(input);
        expect(rescheduleBookingByLink).toHaveBeenCalledWith('s3cr3t-l1nk', '2026-10-11T12:00:00.000Z');
        expect(result).toBe(rescheduled);
    });

    it.each([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ['SlotTakenError', new SlotTakenError('Overlaps a booked Turno for this Employee')],
        ['SlotUnavailableError', new SlotUnavailableError('Slot 2026-10-11T12:00:00.000Z is not available for Service 100')],
    ])('lets %s through', async (_name, error) => {
        const rescheduleBookingByLink = jest.fn().mockRejectedValue(error);
        await expect(rescheduleBookingByLinkUseCase(instrumentation, clientBookingsWith({ rescheduleBookingByLink }))(input)).rejects.toBe(
            error,
        );
    });
});
