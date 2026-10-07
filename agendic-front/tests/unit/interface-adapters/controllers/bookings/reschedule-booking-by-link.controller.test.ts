import { SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { rescheduleBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking-by-link.controller';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 7,
    status: 'PENDING' as const,
    startsAt: '2026-10-11T12:00:00.000Z',
    endsAt: '2026-10-11T13:00:00.000Z',
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

describe('rescheduleBookingByLinkController', () => {
    it('reagenda el Turno del Enlace a startsAt', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await rescheduleBookingByLinkController(instrumentation, useCase)({
            link: 's3cr3t-l1nk',
            startsAt: '2026-10-11T12:00:00.000Z',
        });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk', startsAt: '2026-10-11T12:00:00.000Z' });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing link', { startsAt: '2026-10-11T12:00:00.000Z' }],
        ['a blank link', { link: ' ', startsAt: '2026-10-11T12:00:00.000Z' }],
        ['an invalid startsAt', { link: 's3cr3t-l1nk', startsAt: 'not-a-date' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(rescheduleBookingByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it.each([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ['SlotTakenError', new SlotTakenError('Overlaps a booked Turno for this Employee')],
        ['SlotUnavailableError', new SlotUnavailableError('Slot 2026-10-11T12:00:00.000Z is not available for Service 100')],
    ])('lets %s through', async (_name, error) => {
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(
            rescheduleBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk', startsAt: '2026-10-11T12:00:00.000Z' }),
        ).rejects.toBe(error);
    });
});
