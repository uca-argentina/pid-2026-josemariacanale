import { markBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { employeeBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('markBookingNoShowUseCase', () => {
    it('asks the repository to markNoShow the Turno', async () => {
        const markNoShow = jest.fn().mockResolvedValue(undefined);
        await markBookingNoShowUseCase(instrumentation, employeeBookingsWith({ markNoShow }))(7);
        expect(markNoShow).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const markNoShow = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(markBookingNoShowUseCase(instrumentation, employeeBookingsWith({ markNoShow }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
