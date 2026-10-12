import { rateBookingByLinkUseCase } from '@/src/application/use-cases/bookings/rate-booking-by-link.use-case';
import { BookingAlreadyRatedError, BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

const run = (stub: jest.Mock) =>
    rateBookingByLinkUseCase(instrumentation, clientBookingsWith({ rateBookingByLink: stub }))({ link: 's3cr3t-l1nk', score: 5, comment: 'Genial' });

describe('rateBookingByLinkUseCase', () => {
    it('asks the repository to rate the Turno of the link', async () => {
        const rated = { id: 7 };
        const rateBookingByLink = jest.fn().mockResolvedValue(rated);
        await expect(run(rateBookingByLink)).resolves.toBe(rated);
        expect(rateBookingByLink).toHaveBeenCalledWith('s3cr3t-l1nk', { score: 5, comment: 'Genial' });
    });

    it.each([new NotFoundError('Turno not found'), new BookingStateError('Turno cannot be rated'), new BookingAlreadyRatedError('Turno already rated')])(
        'lets %s through',
        async (error) => {
            await expect(run(jest.fn().mockRejectedValue(error))).rejects.toBe(error);
        },
    );
});
