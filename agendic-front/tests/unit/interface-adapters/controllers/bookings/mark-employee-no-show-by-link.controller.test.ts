import { BookingStateError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { markEmployeeNoShowByLinkController } from '@/src/interface-adapters/controllers/bookings/mark-employee-no-show-by-link.controller';
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
    depositPaidAt: null,
    employeeNoShowAt: '2026-10-10T14:00:00.000Z',
    canMarkEmployeeNoShow: false,
    rating: null,
    canRate: false,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: 20 },
    employeeName: 'Ana',
    business: null,
    branch: null,
    user: { slug: 'juana' },
};

describe('markEmployeeNoShowByLinkController', () => {
    it('marca la Falta del Empleado del Turno del Enlace', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await markEmployeeNoShowByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk' });
        expect(result).toEqual(booking);
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(markEmployeeNoShowByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it.each<[string, Error]>([
        ['NotFoundError', new NotFoundError('Turno not found')],
        ...[
            'Turno is not booked',
            'Turno has not started yet',
            'Employee no-show window closed',
            'Turno has an Ausencia',
            'Employee no-show already marked',
            'Employee no-show not allowed for this Turno',
        ].map((m): [string, Error] => [`BookingStateError "${m}"`, new BookingStateError(m)]),
    ])('lets %s through', async (_name, error) => {
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(markEmployeeNoShowByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' })).rejects.toBe(error);
    });
});
