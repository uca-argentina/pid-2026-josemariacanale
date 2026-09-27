import { updateBookingStatusController } from '@/src/interface-adapters/controllers/bookings/update-booking-status.controller';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const updatedBooking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'ATENDIDO' as const,
};

describe('updateBookingStatusController', () => {
    it('verifies auth, calls useCase, and presents updated booking on valid input', async () => {
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 10 }) });
        const useCase = jest.fn().mockResolvedValue(updatedBooking);

        const result = await updateBookingStatusController(
            instrumentation,
            auth,
            useCase,
        )({ bookingId: 1, status: 'ATENDIDO' });

        expect(auth.getCurrentUser).toHaveBeenCalled();
        expect(useCase).toHaveBeenCalledWith(1, 'ATENDIDO');
        expect(result).toEqual(updatedBooking);
    });

    it('throws InputParseError on invalid status without calling useCase', async () => {
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 10 }) });
        const useCase = jest.fn();

        await expect(
            updateBookingStatusController(
                instrumentation,
                auth,
                useCase,
            )({ bookingId: 1, status: 'ESTADO_INVENTADO' }),
        ).rejects.toBeInstanceOf(InputParseError);

        expect(useCase).not.toHaveBeenCalled();
    });
});
