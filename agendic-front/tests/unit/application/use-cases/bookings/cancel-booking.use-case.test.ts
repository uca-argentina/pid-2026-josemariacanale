import { cancelBookingUseCase } from '@/src/application/use-cases/bookings/cancel-booking.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { userBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('cancelBookingUseCase', () => {
    it('asks the repository to cancel the Turno', async () => {
        const cancel = jest.fn().mockResolvedValue(undefined);
        await cancelBookingUseCase(instrumentation, userBookingsWith({ cancel }))(7);
        expect(cancel).toHaveBeenCalledWith(7, undefined, undefined);
    });

    it('passes the Motivo de cancelación to the repository', async () => {
        const cancel = jest.fn().mockResolvedValue(undefined);
        await cancelBookingUseCase(instrumentation, userBookingsWith({ cancel }))(7, 'Estoy de viaje');
        expect(cancel).toHaveBeenCalledWith(7, 'Estoy de viaje', undefined);
    });

    it('asks the repository to cancel this Turno and the following ones of its Serie', async () => {
        const cancel = jest.fn().mockResolvedValue(undefined);
        await cancelBookingUseCase(instrumentation, userBookingsWith({ cancel }))(7, 'Estoy de viaje', true);
        expect(cancel).toHaveBeenCalledWith(7, 'Estoy de viaje', true);
    });

    it('lets NotFoundError through', async () => {
        const cancel = jest.fn().mockRejectedValue(new NotFoundError('no'));
        await expect(cancelBookingUseCase(instrumentation, userBookingsWith({ cancel }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
