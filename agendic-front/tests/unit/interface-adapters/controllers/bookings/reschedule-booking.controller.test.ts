import { rescheduleBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const startsAt = '2026-10-02T15:00:00.000Z';

describe('rescheduleBookingController', () => {
    it('runs the use case with the id and the chosen horario', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await rescheduleBookingController(instrumentation, signedIn, useCase)({ bookingId: 7, startsAt });
        expect(useCase).toHaveBeenCalledWith({ bookingId: 7, startsAt });
    });

    it.each([{ startsAt }, { bookingId: 7 }, { bookingId: 7, startsAt: 'mañana' }, { bookingId: '7', startsAt }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(rescheduleBookingController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(rescheduleBookingController(instrumentation, auth, useCase)({ bookingId: 7, startsAt })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
