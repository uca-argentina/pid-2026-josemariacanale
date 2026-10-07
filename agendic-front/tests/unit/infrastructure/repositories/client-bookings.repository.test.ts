import { BookingStateError, ClientAccessExpiredError, InvalidVerificationCodeError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { ClientBookingsRepository } from '@/src/infrastructure/repositories/client-bookings.repository';
import { instrumentation } from '@/tests/unit/stubs';

const repo = (apiUrl: string | undefined = 'http://api') => new ClientBookingsRepository(instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

const booking = {
    id: 7,
    status: 'BOOKED',
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

describe('ClientBookingsRepository.openAccess', () => {
    it('POSTs email y code sin header de acceso, y devuelve el acceso', async () => {
        const access = { access: 'signed-token', expiresAt: '2026-10-10T12:15:00.000Z' };
        const fetchSpy = respond(200, access);

        await expect(repo().openAccess('juana@example.com', 'ABC123')).resolves.toEqual(access);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/client-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'juana@example.com', code: 'ABC123' }),
        });
    });

    it('translates a 400 to InvalidVerificationCodeError, keeping the message', async () => {
        respond(400, { statusCode: 400, message: 'Invalid or expired verification code for juana@example.com' });
        const error = await repo().openAccess('juana@example.com', 'ABC123').catch((e) => e);
        expect(error).toBeInstanceOf(InvalidVerificationCodeError);
        expect(error.message).toBe('Invalid or expired verification code for juana@example.com');
    });
});

describe('ClientBookingsRepository.listBookings', () => {
    it('GETs con el header X-Client-Access, y devuelve los Turnos', async () => {
        const fetchSpy = respond(200, [booking]);

        await expect(repo().listBookings('signed-token')).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/client/bookings', {
            method: 'GET',
            headers: { 'X-Client-Access': 'signed-token' },
        });
    });

    it('translates a 401 to ClientAccessExpiredError, keeping the message', async () => {
        respond(401, { statusCode: 401, message: 'Client access missing or expired' });
        const error = await repo().listBookings('expired').catch((e) => e);
        expect(error).toBeInstanceOf(ClientAccessExpiredError);
        expect(error.message).toBe('Client access missing or expired');
    });

    it('translates a body that does not match the schema to ApiRequestError with the cause', async () => {
        respond(200, [{ ...booking, status: 'SOMETHING' }]);
        const error = await repo().listBookings('signed-token').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});

describe('ClientBookingsRepository.cancel', () => {
    it('PATCHes con el header de acceso, sin body, y devuelve el Turno', async () => {
        const cancelled = { ...booking, status: 'CANCELLED' };
        const fetchSpy = respond(200, cancelled);

        await expect(repo().cancel('signed-token', 7)).resolves.toEqual(cancelled);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/client/bookings/7/cancel', {
            method: 'PATCH',
            headers: { 'X-Client-Access': 'signed-token' },
        });
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Turno 7 not found' });
        await expect(repo().cancel('signed-token', 7)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 422 to BookingStateError, keeping the message', async () => {
        respond(422, { statusCode: 422, message: 'Turno 7 already started' });
        const error = await repo().cancel('signed-token', 7).catch((e) => e);
        expect(error).toBeInstanceOf(BookingStateError);
        expect(error.message).toBe('Turno 7 already started');
    });
});

describe('ClientBookingsRepository.reschedule', () => {
    const startsAt = '2026-10-11T12:00:00.000Z';

    it('PATCHes startsAt con el header de acceso, y devuelve el Turno', async () => {
        const fetchSpy = respond(200, booking);

        await expect(repo().reschedule('signed-token', 7, startsAt)).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/client/bookings/7/reschedule', {
            method: 'PATCH',
            headers: { 'X-Client-Access': 'signed-token', 'Content-Type': 'application/json' },
            body: JSON.stringify({ startsAt }),
        });
    });

    it('translates a 409 to SlotTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Overlaps a booked Turno for this Employee' });
        await expect(repo().reschedule('signed-token', 7, startsAt)).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('translates the 422 de horario no disponible a SlotUnavailableError', async () => {
        respond(422, { statusCode: 422, message: 'Slot 2026-10-11T12:00:00.000Z is not available for Service 100' });
        await expect(repo().reschedule('signed-token', 7, startsAt)).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it('translates any other 422 to BookingStateError', async () => {
        respond(422, { statusCode: 422, message: 'Turno is not pending or booked' });
        await expect(repo().reschedule('signed-token', 7, startsAt)).rejects.toBeInstanceOf(BookingStateError);
    });

    it('translates a 401 to ClientAccessExpiredError', async () => {
        respond(401, { statusCode: 401, message: 'Client access missing or expired' });
        await expect(repo().reschedule('signed-token', 7, startsAt)).rejects.toBeInstanceOf(ClientAccessExpiredError);
    });
});

describe('ClientBookingsRepository misc', () => {
    it('throws ApiRequestError without calling the back when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listBookings('signed-token')).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listBookings('signed-token').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('runs each method inside a span named after the repository and the method', async () => {
        const names: string[] = [];
        const spanning = new ClientBookingsRepository({ startSpan: (options, callback) => (names.push(options.name), callback()) }, 'http://api');
        respond(404, { message: 'nope' });
        await spanning.openAccess('juana@example.com', 'ABC123').catch(() => undefined);
        await spanning.listBookings('signed-token').catch(() => undefined);
        await spanning.cancel('signed-token', 7).catch(() => undefined);
        await spanning.reschedule('signed-token', 7, '2026-10-11T12:00:00.000Z').catch(() => undefined);
        expect(names).toEqual([
            'ClientBookingsRepository > openAccess',
            'ClientBookingsRepository > listBookings',
            'ClientBookingsRepository > cancel',
            'ClientBookingsRepository > reschedule',
        ]);
    });
});
