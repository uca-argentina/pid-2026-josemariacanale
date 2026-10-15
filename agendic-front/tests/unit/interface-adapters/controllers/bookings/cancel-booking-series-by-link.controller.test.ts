import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { cancelBookingSeriesByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-series-by-link.controller';
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
    user: { slug: 'juana' },
    series: null,
};

describe('cancelBookingSeriesByLinkController', () => {
    it('cancela el Turno del Enlace y los siguientes, y dice cuáles quedaron en pie', async () => {
        const kept = { ...booking, id: 9, status: 'BOOKED' as const, startsAt: '2026-10-24T12:00:00.000Z' };
        const useCase = jest.fn().mockResolvedValue({ cancelled: [booking, { ...booking, id: 8 }], kept: [kept] });

        const result = await cancelBookingSeriesByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk', reason: 'Me mudo' });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', reason: 'Me mudo' });
        expect(result.booking).toMatchObject({ id: 7, status: 'CANCELLED' });
        expect(result.kept).toEqual([{ startsAt: '2026-10-24T12:00:00.000Z' }]);
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(cancelBookingSeriesByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets BookingStateError through', async () => {
        const error = new BookingStateError('Turno 7 is not part of a Serie');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(cancelBookingSeriesByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' })).rejects.toBe(error);
    });
});
