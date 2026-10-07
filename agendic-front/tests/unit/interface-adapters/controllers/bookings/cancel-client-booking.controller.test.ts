import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { cancelClientBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-client-booking.controller';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 7,
    status: 'CANCELLED' as const,
    startsAt: '2026-10-10T12:00:00.000Z',
    endsAt: '2026-10-10T13:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    notes: null,
    clientName: 'Juana Pérez',
    serviceId: 100,
    employeeId: 1,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: null },
    employeeName: 'Ana',
    business: null,
    branch: null,
};

describe('cancelClientBookingController', () => {
    it('cancela el Turno con el access y el bookingId', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await cancelClientBookingController(instrumentation, useCase)({ access: 'signed-token', bookingId: 7 });

        expect(useCase).toHaveBeenCalledWith({ access: 'signed-token', bookingId: 7 });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing access', { bookingId: 7 }],
        ['an invalid bookingId', { access: 'signed-token', bookingId: -1 }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(cancelClientBookingController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets NotFoundError through', async () => {
        const error = new NotFoundError('Turno 7 not found');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(cancelClientBookingController(instrumentation, useCase)({ access: 'signed-token', bookingId: 7 })).rejects.toBe(
            error,
        );
    });

    it('lets BookingStateError through', async () => {
        const error = new BookingStateError('Turno 7 already started');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(cancelClientBookingController(instrumentation, useCase)({ access: 'signed-token', bookingId: 7 })).rejects.toBe(
            error,
        );
    });
});
