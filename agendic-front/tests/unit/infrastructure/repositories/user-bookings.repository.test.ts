import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { BookingNotAllowedError, BookingStateError, CancellationReasonTooLongError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { UserBookingsRepository } from '@/src/infrastructure/repositories/user-bookings.repository';
import { authWith } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    status: 'BOOKED',
    startsAt: '2026-10-01T15:00:00.000Z',
    endsAt: '2026-10-01T15:45:00.000Z',
    clientName: 'Lucía',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    employeeNoShowAt: null,
    serviceId: 2,
    serviceName: 'Masaje',
    employeeId: 5,
    employeeChosen: false,
    depositAmount: 3600,
    depositPaidAt: null,
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
    cabin: { id: 6, name: 'Box 1' },
    fromRescheduleId: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationCause: null,
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new UserBookingsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('UserBookingsRepository.listMyBookings', () => {
    it('GETs the Turnos with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [booking]);

        await expect(repo().listMyBookings()).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/bookings',
            expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('parses a Turno of a Servicio personal, without Empleado, Negocio or Sucursal', async () => {
        const personal = { ...booking, employeeId: null, business: null, branch: null, cabin: null };
        respond(200, [personal]);
        await expect(repo().listMyBookings()).resolves.toEqual([personal]);
    });

    it('parses a Turno without Cabina, with cabin null', async () => {
        const withoutCabin = { ...booking, cabin: null };
        respond(200, [withoutCabin]);
        await expect(repo().listMyBookings()).resolves.toEqual([withoutCabin]);
    });

    it('rejects a Turno that comes without the cabin field', async () => {
        const { cabin: _cabin, ...withoutField } = booking;
        respond(200, [withoutField]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('parses the Causa de cancelación of a Turno cancelled by a schedule change', async () => {
        const caused = { ...booking, status: 'CANCELLED', cancelledBy: 'EMPLOYEE', cancellationReason: 'Vacaciones', cancellationCause: 'OUT_OF_OFFICE' };
        respond(200, [caused]);
        await expect(repo().listMyBookings()).resolves.toEqual([caused]);
    });

    it('rejects an unknown Causa de cancelación', async () => {
        respond(200, [{ ...booking, cancellationCause: 'OTHER' }]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('rejects a Turno that comes without the cancellationCause field', async () => {
        const { cancellationCause: _cause, ...withoutField } = booking;
        respond(200, [withoutField]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('returns an empty list as is', async () => {
        respond(200, []);
        await expect(repo().listMyBookings()).resolves.toEqual([]);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates the 422 of horario no disponible to SlotUnavailableError', async () => {
        respond(422, { message: 'Slot 2026-10-02T15:00:00.000Z is not available for Service 3' });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it('translates another status to ApiRequestError carrying it', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listMyBookings()).rejects.toMatchObject({ status: 500 });
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listMyBookings().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('translates a body that does not match the schema to ApiRequestError without status', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listMyBookings().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('UserBookingsRepository actions', () => {
    const actions = [
        ['accept', 'accept', () => repo().accept(7)],
        ['reject', 'reject', () => repo().reject(7)],
        ['cancel', 'cancel', () => repo().cancel(7)],
        ['markNoShow', 'no-show', () => repo().markNoShow(7)],
    ] as const;

    it.each(actions)('%s PATCHes /bookings/:id/%s with the bearer token and no body', async (_method, route, run) => {
        const fetchSpy = respond(200, {});
        await run();
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/bookings/7/${route}`,
            expect.objectContaining({ method: 'PATCH', headers: { Authorization: 'Bearer tok' }, body: undefined }),
        );
    });

    it.each([
        ['reject', () => repo().reject(7, 'Estoy de viaje')],
        ['cancel', () => repo().cancel(7, 'Estoy de viaje')],
    ] as const)('%s sends the Motivo de cancelación in the body', async (route, run) => {
        const fetchSpy = respond(200, {});
        await run();
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/bookings/7/${route}`,
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ reason: 'Estoy de viaje' }) }),
        );
    });

    it.each([
        ['reject', () => repo().reject(7, 'x'.repeat(501))],
        ['cancel', () => repo().cancel(7, 'x'.repeat(501))],
    ] as const)('%s translates the 400 of a too long Motivo to CancellationReasonTooLongError', async (_route, run) => {
        respond(400, { statusCode: 400, message: 'reason is too long' });
        await expect(run()).rejects.toBeInstanceOf(CancellationReasonTooLongError);
    });

    it('keeps any other 400 as ApiRequestError', async () => {
        respond(400, { statusCode: 400, message: 'reason must be a string' });
        await expect(repo().cancel(7, 'x')).rejects.toMatchObject({ constructor: ApiRequestError, status: 400 });
    });

    it('reschedule PATCHes /bookings/:id/reschedule with the chosen startsAt', async () => {
        const fetchSpy = respond(200, { id: 9 });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).resolves.toEqual({ id: 9 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/bookings/7/reschedule',
            expect.objectContaining({
                method: 'PATCH',
                headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
                body: JSON.stringify({ startsAt: '2026-10-02T15:00:00.000Z' }),
            }),
        );
    });

    it.each([
        [401, UnauthenticatedError],
        [403, BookingNotAllowedError],
        [404, NotFoundError],
        [409, SlotTakenError],
        [422, BookingStateError],
    ])('translates a %i to its domain error', async (status, DomainError) => {
        respond(status, { message: 'no' });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).rejects.toBeInstanceOf(DomainError);
    });

    it('translates another status to ApiRequestError carrying it', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().accept(7)).rejects.toMatchObject({ status: 500 });
    });
});
