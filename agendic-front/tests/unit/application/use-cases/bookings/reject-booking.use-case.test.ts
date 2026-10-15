import { rejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('rejectBookingUseCase', () => {
    it('asks the repository to reject the Turno', async () => {
        const reject = jest.fn().mockResolvedValue(undefined);
        await rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7);
        expect(reject).toHaveBeenCalledWith(7, undefined, undefined);
    });

    it('passes the Motivo de cancelación to the repository', async () => {
        const reject = jest.fn().mockResolvedValue(undefined);
        await rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7, 'Estoy de viaje');
        expect(reject).toHaveBeenCalledWith(7, 'Estoy de viaje', undefined);
    });

    it('asks the repository to reject the whole Serie', async () => {
        const reject = jest.fn().mockResolvedValue(undefined);
        await rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7, 'Estoy de viaje', true);
        expect(reject).toHaveBeenCalledWith(7, 'Estoy de viaje', true);
    });

    it('lets NotFoundError through', async () => {
        const reject = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(rejectBookingUseCase(instrumentation, userBookingsWith({ reject }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
