import { markEmployeeNoShowByLinkUseCase } from '@/src/application/use-cases/bookings/mark-employee-no-show-by-link.use-case';
import { BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('markEmployeeNoShowByLinkUseCase', () => {
    it('asks the repository to mark the Falta del Empleado of the Turno of the link', async () => {
        const paid = { id: 7 };
        const markEmployeeNoShowByLink = jest.fn().mockResolvedValue(paid);
        const result = await markEmployeeNoShowByLinkUseCase(instrumentation, clientBookingsWith({ markEmployeeNoShowByLink }))({ link: 's3cr3t-l1nk' });
        expect(markEmployeeNoShowByLink).toHaveBeenCalledWith('s3cr3t-l1nk');
        expect(result).toBe(paid);
    });

    it('lets NotFoundError through', async () => {
        const markEmployeeNoShowByLink = jest.fn().mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(
            markEmployeeNoShowByLinkUseCase(instrumentation, clientBookingsWith({ markEmployeeNoShowByLink }))({ link: 'unknown' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets BookingStateError through', async () => {
        const markEmployeeNoShowByLink = jest.fn().mockRejectedValue(new BookingStateError('Employee no-show already marked'));
        await expect(
            markEmployeeNoShowByLinkUseCase(instrumentation, clientBookingsWith({ markEmployeeNoShowByLink }))({ link: 's3cr3t-l1nk' }),
        ).rejects.toBeInstanceOf(BookingStateError);
    });
});
