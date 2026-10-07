import { listClientBookingsUseCase } from '@/src/application/use-cases/bookings/list-client-bookings.use-case';
import { ClientAccessExpiredError } from '@/src/entities/errors/booking';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('listClientBookingsUseCase', () => {
    it('asks the repository to list the Turnos of the access', async () => {
        const listBookings = jest.fn().mockResolvedValue([]);
        await listClientBookingsUseCase(instrumentation, clientBookingsWith({ listBookings }))('signed-token');
        expect(listBookings).toHaveBeenCalledWith('signed-token');
    });

    it('lets ClientAccessExpiredError through', async () => {
        const listBookings = jest.fn().mockRejectedValue(new ClientAccessExpiredError('no'));
        await expect(
            listClientBookingsUseCase(instrumentation, clientBookingsWith({ listBookings }))('signed-token'),
        ).rejects.toBeInstanceOf(ClientAccessExpiredError);
    });
});
