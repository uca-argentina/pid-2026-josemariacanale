import { cancelBookingSeriesByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-series-by-link.use-case';
import { BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('cancelBookingSeriesByLinkUseCase', () => {
    it('asks the repository to cancel the Turno of the link and the following ones', async () => {
        const result = { cancelled: [{ id: 7 }], kept: [] };
        const cancelBookingSeriesByLink = jest.fn().mockResolvedValue(result);
        await expect(
            cancelBookingSeriesByLinkUseCase(instrumentation, clientBookingsWith({ cancelBookingSeriesByLink }))({ link: 's3cr3t-l1nk', reason: 'Me mudo' }),
        ).resolves.toBe(result);
        expect(cancelBookingSeriesByLink).toHaveBeenCalledWith('s3cr3t-l1nk', 'Me mudo');
    });

    it.each([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ['BookingStateError', new BookingStateError('Turno 7 is not part of a Serie')],
    ])('lets %s through', async (_name, error) => {
        const cancelBookingSeriesByLink = jest.fn().mockRejectedValue(error);
        await expect(
            cancelBookingSeriesByLinkUseCase(instrumentation, clientBookingsWith({ cancelBookingSeriesByLink }))({ link: 's3cr3t-l1nk' }),
        ).rejects.toBe(error);
    });
});
