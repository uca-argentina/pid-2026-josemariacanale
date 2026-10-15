import { rejectBookingController } from '@/src/interface-adapters/controllers/bookings/reject-booking.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });

describe('rejectBookingController', () => {
    it('runs the use case with the id of the Turno', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await rejectBookingController(instrumentation, signedIn, useCase)({ bookingId: 7 });
        expect(useCase).toHaveBeenCalledWith(7, undefined, undefined);
    });

    it('runs the use case with the Motivo de cancelación', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await rejectBookingController(instrumentation, signedIn, useCase)({ bookingId: 7, reason: 'Estoy de viaje' });
        expect(useCase).toHaveBeenCalledWith(7, 'Estoy de viaje', undefined);
    });

    it('runs the use case with `series`', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await rejectBookingController(instrumentation, signedIn, useCase)({ bookingId: 7, series: true });
        expect(useCase).toHaveBeenCalledWith(7, undefined, true);
    });

    it.each([{}, { bookingId: '7' }, { bookingId: 0 }, { bookingId: 7, reason: 3 }])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(rejectBookingController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(rejectBookingController(instrumentation, auth, useCase)({ bookingId: 7 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
