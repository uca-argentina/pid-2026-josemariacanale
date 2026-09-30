import { listMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { instrumentation } from '@/tests/unit/stubs';

describe('listMyBookingsUseCase', () => {
    it('returns what the repository lists', async () => {
        const bookings = [{ id: 1 }];
        const listMyBookings = jest.fn().mockResolvedValue(bookings);
        await expect(listMyBookingsUseCase(instrumentation, { listMyBookings })()).resolves.toBe(bookings);
    });

    it('lets UnauthenticatedError through', async () => {
        const listMyBookings = jest.fn().mockRejectedValue(new UnauthenticatedError('no'));
        await expect(listMyBookingsUseCase(instrumentation, { listMyBookings })()).rejects.toBeInstanceOf(UnauthenticatedError);
    });
});
