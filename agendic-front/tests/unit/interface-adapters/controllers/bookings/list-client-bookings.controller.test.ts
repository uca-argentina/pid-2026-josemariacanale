import { ClientAccessExpiredError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { listClientBookingsController } from '@/src/interface-adapters/controllers/bookings/list-client-bookings.controller';
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
    employeeId: 1,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: null },
    employeeName: 'Ana',
    business: { name: 'Peluquería Luna', slug: 'peluqueria-luna' },
    branch: { name: 'Centro', slug: 'centro', address: 'Av. Siempreviva 742', coverUrl: null },
};

describe('listClientBookingsController', () => {
    it('lista los Turnos del acceso', async () => {
        const useCase = jest.fn().mockResolvedValue([booking]);

        const result = await listClientBookingsController(instrumentation, useCase)({ access: 'signed-token' });

        expect(useCase).toHaveBeenCalledWith('signed-token');
        expect(result).toEqual([booking]);
    });

    it('throws InputParseError without access, without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(listClientBookingsController(instrumentation, useCase)({})).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets ClientAccessExpiredError through', async () => {
        const error = new ClientAccessExpiredError('Client access missing or expired');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(listClientBookingsController(instrumentation, useCase)({ access: 'expired' })).rejects.toBe(error);
    });
});
