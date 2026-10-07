import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { cancelBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-by-link.controller';
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
    employeeId: null,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: null },
    employeeName: 'Ana',
    business: null,
    branch: null,
};

describe('cancelBookingByLinkController', () => {
    it('cancela el Turno del Enlace', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await cancelBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk' });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(cancelBookingByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it.each([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ['BookingStateError', new BookingStateError('Turno 7 already started')],
    ])('lets %s through', async (_name, error) => {
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(cancelBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' })).rejects.toBe(error);
    });
});
