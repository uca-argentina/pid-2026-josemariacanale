import { BookingAlreadyRatedError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { rateBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/rate-booking-by-link.controller';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 7,
    status: 'BOOKED' as const,
    startsAt: '2026-10-10T12:00:00.000Z',
    endsAt: '2026-10-10T13:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    notes: null,
    clientName: 'Juana Pérez',
    serviceId: 100,
    employeeId: null,
    employeeChosen: false,
    depositAmount: null,
    depositPaidAt: null,
    employeeNoShowAt: null,
    canMarkEmployeeNoShow: false,
    rating: { score: 5, comment: null, createdAt: '2026-10-10T14:00:00.000Z' },
    canRate: false,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: null },
    employeeName: 'Ana',
    business: null,
    branch: null,
    user: { slug: 'juana' },
};

describe('rateBookingByLinkController', () => {
    it('califica el Turno del Enlace y presenta el Turno', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);
        const result = await rateBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk', score: 5, comment: '  Genial ' });
        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', score: 5, comment: 'Genial' });
        expect(result).toEqual(booking);
    });

    it('omite un comentario en blanco', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);
        await rateBookingByLinkController(instrumentation, useCase)({ link: 'l', score: 3, comment: '   ' });
        expect(useCase).toHaveBeenCalledWith({ link: 'l', score: 3, comment: undefined });
    });

    it.each([
        ['a missing link', { score: 5 }],
        ['a blank link', { link: '', score: 5 }],
        ['a missing score', { link: 'l' }],
        ['a score of 0', { link: 'l', score: 0 }],
        ['a score of 6', { link: 'l', score: 6 }],
        ['a fractional score', { link: 'l', score: 4.5 }],
        ['a 501-character comment', { link: 'l', score: 5, comment: 'a'.repeat(501) }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(rateBookingByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets the 409 through', async () => {
        const error = new BookingAlreadyRatedError('Turno already rated');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(rateBookingByLinkController(instrumentation, useCase)({ link: 'l', score: 5 })).rejects.toBe(error);
    });
});
