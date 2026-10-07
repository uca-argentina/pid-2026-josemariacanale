import { getBookingByLinkUseCase } from '@/src/application/use-cases/bookings/get-booking-by-link.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('getBookingByLinkUseCase', () => {
    it('asks the repository for the Turno of the link', async () => {
        const booking = { id: 7 };
        const getBookingByLink = jest.fn().mockResolvedValue(booking);
        const result = await getBookingByLinkUseCase(instrumentation, clientBookingsWith({ getBookingByLink }))({ link: 's3cr3t-l1nk' });
        expect(getBookingByLink).toHaveBeenCalledWith('s3cr3t-l1nk');
        expect(result).toBe(booking);
    });

    it('lets NotFoundError through', async () => {
        const getBookingByLink = jest.fn().mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(
            getBookingByLinkUseCase(instrumentation, clientBookingsWith({ getBookingByLink }))({ link: 'unknown' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
