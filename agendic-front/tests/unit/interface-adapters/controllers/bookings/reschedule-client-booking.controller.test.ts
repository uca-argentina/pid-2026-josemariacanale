import { SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { rescheduleClientBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-client-booking.controller';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 7,
    status: 'BOOKED' as const,
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

describe('rescheduleClientBookingController', () => {
    it('reagenda el Turno con el access, el bookingId y startsAt', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await rescheduleClientBookingController(instrumentation, useCase)({
            access: 'signed-token',
            bookingId: 7,
            startsAt: '2026-10-11T12:00:00.000Z',
        });

        expect(useCase).toHaveBeenCalledWith({ access: 'signed-token', bookingId: 7, startsAt: '2026-10-11T12:00:00.000Z' });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing access', { bookingId: 7, startsAt: '2026-10-11T12:00:00.000Z' }],
        ['an invalid bookingId', { access: 'signed-token', bookingId: -1, startsAt: '2026-10-11T12:00:00.000Z' }],
        ['an invalid startsAt', { access: 'signed-token', bookingId: 7, startsAt: 'not-a-date' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(rescheduleClientBookingController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets SlotTakenError through', async () => {
        const error = new SlotTakenError('Overlaps a booked Turno for this Employee');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(
            rescheduleClientBookingController(instrumentation, useCase)({
                access: 'signed-token',
                bookingId: 7,
                startsAt: '2026-10-11T12:00:00.000Z',
            }),
        ).rejects.toBe(error);
    });

    it('lets SlotUnavailableError through', async () => {
        const error = new SlotUnavailableError('Slot 2026-10-11T12:00:00.000Z is not available for Service 100');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(
            rescheduleClientBookingController(instrumentation, useCase)({
                access: 'signed-token',
                bookingId: 7,
                startsAt: '2026-10-11T12:00:00.000Z',
            }),
        ).rejects.toBe(error);
    });
});
