import { rejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('rejectBookingUseCase', () => {
    it('asks the repository to reject the Turno', async () => {
        const reject = jest.fn().mockResolvedValue(undefined);
        await rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7);
        expect(reject).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const reject = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
