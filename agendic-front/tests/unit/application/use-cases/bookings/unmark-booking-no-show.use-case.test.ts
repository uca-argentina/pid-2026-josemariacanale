import { unmarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/unmark-booking-no-show.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('unmarkBookingNoShowUseCase', () => {
    it('asks the repository to unmark the Ausencia del Invitado', async () => {
        const unmarkNoShow = jest.fn().mockResolvedValue(undefined);
        await unmarkBookingNoShowUseCase(instrumentation, userBookingsWith({ unmarkNoShow }))(7);
        expect(unmarkNoShow).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const unmarkNoShow = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(unmarkBookingNoShowUseCase(instrumentation, userBookingsWith({ unmarkNoShow }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
