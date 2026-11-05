import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { getBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/get-booking-by-link.controller';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 7,
    status: 'BOOKED' as const,
    startsAt: '2026-10-10T12:00:00.000Z',
    endsAt: '2026-10-10T13:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    notes: 'Llego 5 minutos antes',
    clientName: 'Juana Pérez',
    serviceId: 100,
    employeeId: 1,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: 20 },
    employeeName: 'Ana',
    business: { name: 'Peluquería Luna', slug: 'peluqueria-luna' },
    branch: { name: 'Centro', slug: 'centro', address: 'Av. Siempreviva 742', coverUrl: null, location: null },
    user: null,
};

describe('getBookingByLinkController', () => {
    it('devuelve el Turno del Enlace, con el link recortado', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...booking, streak: null });

        const result = await getBookingByLinkController(instrumentation, useCase)({ link: ' s3cr3t-l1nk ' });

        expect(useCase).toHaveBeenCalledWith({ link: 's3cr3t-l1nk' });
        expect(result).toEqual({ booking, streak: null });
    });

    it('presenta la Racha del Cliente aparte del Turno, con los días en la zona del Turno', async () => {
        const racha = {
            count: 3,
            burnsAt: '2026-12-13T01:30:00.000Z',
            nextReward: {
                reward: { id: 7, requiredCount: 5, repeatable: false, type: 'PERCENT_DISCOUNT' as const, value: 20, description: null, service: null, validForDays: null },
                remaining: 2,
            },
            prizes: [{ id: 3, type: 'GIFT' as const, value: null, description: 'Un lavado', serviceName: null, grantedAt: '2026-10-01T12:00:00.000Z', expiresAt: '2026-11-30T15:00:00.000Z' }],
        };
        const useCase = jest.fn().mockResolvedValue({ ...booking, streak: racha });

        const result = await getBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' });

        expect(result.streak).toEqual({
            title: '3 Turnos',
            progress: { done: 3, total: 5 },
            nextReward: 'Te faltan 2 Turnos para 20% de descuento',
            returnBy: 'Volvé antes del 12/12',
            prizes: [{ id: 3, text: 'Un lavado', expires: 'Vence el 30/11' }],
        });
        expect(result.booking).not.toHaveProperty('streak');
    });

    // En un Servicio personal no hay Negocio ni Sucursal: el Enlace de reserva para volver es el del Usuario.
    it('devuelve el Enlace de reserva del Usuario en un Turno de un Servicio personal', async () => {
        const personal = { ...booking, business: null, branch: null, user: { slug: 'juana' }, streak: null };
        const useCase = jest.fn().mockResolvedValue(personal);

        await expect(getBookingByLinkController(instrumentation, useCase)({ link: 's3cr3t-l1nk' })).resolves.toMatchObject({
            booking: { business: null, branch: null, user: { slug: 'juana' } },
        });
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(getBookingByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets NotFoundError through', async () => {
        const error = new NotFoundError('Turno not found');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(getBookingByLinkController(instrumentation, useCase)({ link: 'unknown' })).rejects.toBe(error);
    });
});
