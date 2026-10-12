import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { payDepositByLinkController } from '@/src/interface-adapters/controllers/bookings/pay-deposit-by-link.controller';
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
    depositAmount: 1000,
    depositPaidAt: '2026-10-09T12:00:00.000Z',
    employeeNoShowAt: null,
    canMarkEmployeeNoShow: false,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: 20 },
    employeeName: 'Ana',
    business: null,
    branch: null,
    user: { slug: 'juana' },
};

describe('payDepositByLinkController', () => {
    it('paga la Seña del Turno del Enlace', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await payDepositByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk' });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(payDepositByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it.each([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ['BookingStateError', new BookingStateError('Turno 7 has no Seña')],
    ])('lets %s through', async (_name, error) => {
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(payDepositByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' })).rejects.toBe(error);
    });
});
