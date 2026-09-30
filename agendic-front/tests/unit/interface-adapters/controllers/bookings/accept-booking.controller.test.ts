import { acceptBookingController } from '@/src/interface-adapters/controllers/bookings/accept-booking.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });

describe('acceptBookingController', () => {
    it('runs the use case with the id of the Turno', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await acceptBookingController(instrumentation, signedIn, useCase)({ bookingId: 7 });
        expect(useCase).toHaveBeenCalledWith(7);
    });

    it.each([{}, { bookingId: '7' }, { bookingId: 0 }])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(acceptBookingController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(acceptBookingController(instrumentation, auth, useCase)({ bookingId: 7 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
