import { acceptBookingUseCase } from '@/src/application/use-cases/bookings/accept-booking.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('acceptBookingUseCase', () => {
    it('asks the repository to accept the Turno', async () => {
        const accept = jest.fn().mockResolvedValue(undefined);
        await acceptBookingUseCase(instrumentation, userBookingsWith({ accept }))(7);
        expect(accept).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const accept = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(acceptBookingUseCase(instrumentation, userBookingsWith({ accept }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
