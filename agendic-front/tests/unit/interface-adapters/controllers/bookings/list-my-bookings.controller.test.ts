import { listMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    status: 'PENDING' as const,
    startsAt: '2026-10-01T15:00:00.000Z',
    endsAt: '2026-10-01T15:45:00.000Z',
    clientName: 'Lucía',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    serviceId: 2,
    serviceName: 'Masaje',
    employeeId: 5,
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
};

describe('listMyBookingsController', () => {
    it('presents the Turnos with the names of where they happen', async () => {
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
        const [presented] = await listMyBookingsController(instrumentation, auth, jest.fn().mockResolvedValue([booking]))();
        expect(presented).toEqual({
            id: 1,
            status: 'PENDING',
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            clientName: 'Lucía',
            clientEmail: 'lucia@gmail.com',
            noShowAt: null,
            serviceId: 2,
            employeeId: 5,
            serviceName: 'Masaje',
            businessName: 'Spa',
            branchName: 'Centro',
        });
    });

    it('presents a Turno of a Servicio personal without Negocio or Sucursal', async () => {
        const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
        const personal = { ...booking, employeeId: null, business: null, branch: null };
        const [presented] = await listMyBookingsController(instrumentation, auth, jest.fn().mockResolvedValue([personal]))();
        expect(presented).toMatchObject({ employeeId: null, businessName: null, branchName: null });
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(listMyBookingsController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
