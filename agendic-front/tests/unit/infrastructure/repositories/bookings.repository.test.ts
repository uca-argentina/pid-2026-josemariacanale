import { BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { instrumentation } from '@/tests/unit/stubs';

const repo = (apiUrl: string | undefined = 'http://api') => new BookingsRepository(instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BookingsRepository.listSlots', () => {
    const query = { serviceId: 100, from: '2026-09-28', to: '2026-10-11' };

    it('GETs the Horarios reservables of the Servicio, without a Sesión', async () => {
        const slots = {
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                { date: '2026-09-28', slots: ['2026-09-28T12:00:00.000Z', '2026-09-28T12:15:00.000Z'] },
                { date: '2026-09-29', slots: [], reason: 'NOT_WORKING' },
                { date: '2026-09-30', slots: [], reason: 'FULLY_BOOKED' },
            ],
        };
        const fetchSpy = respond(200, slots);

        await expect(repo().listSlots(query)).resolves.toEqual(slots);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/services/100/slots?from=2026-09-28&to=2026-10-11', {});
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().listSlots(query)).rejects.toBeInstanceOf(NotFoundError);
    });

    // The controller already validates the query: a 400 or 422 is a bug of the front, to report.
    it.each([400, 422])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'Invalid range' });
        const error = await repo().listSlots(query).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(status);
    });

    it('translates the 422 of horario no disponible to SlotUnavailableError when booking', async () => {
        respond(422, { statusCode: 422, message: 'Slot 2026-10-02T15:00:00.000Z is not available for Service 100' });
        await expect(repo().book({} as never)).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it('translates an unknown reason to ApiRequestError', async () => {
        respond(200, { timeZone: 'UTC', days: [{ date: '2026-09-28', slots: [], reason: 'HOLIDAY' }] });
        await expect(repo().listSlots(query)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listSlots(query).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('throws ApiRequestError without calling the back when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listSlots(query)).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('BookingsRepository.book', () => {
    const input = {
        serviceId: 100,
        startsAt: '2026-09-28T12:00:00.000Z',
        clientName: 'Juana Pérez',
        clientEmail: 'juana@example.com',
        notes: 'Llego 5 minutos tarde',
    };
    const booking = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'UNVERIFIED',
        notes: 'Llego 5 minutos tarde',
    };

    it('POSTs the Turno as JSON, without a Sesión, and returns it as created', async () => {
        const fetchSpy = respond(201, booking);

        await expect(repo().book(input)).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
    });

    it('accepts a Turno whose back does not return notes yet', async () => {
        const withoutNotes = { ...booking, notes: undefined };
        respond(201, withoutNotes);
        await expect(repo().book(input)).resolves.toEqual(withoutNotes);
    });

    it('translates a 409 to SlotTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Overlaps a booked Turno for this Employee' });
        await expect(repo().book(input)).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().book(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([400, 422, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'boom' });
        const error = await repo().book(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(status);
    });

    it('translates a body that does not match the schema to ApiRequestError with the cause', async () => {
        respond(201, { ...booking, status: 'SOMETHING' });
        const error = await repo().book(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().book(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });
});

describe('BookingsRepository.verifyBooking', () => {
    const verified = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'BOOKED',
    };

    it('POSTs the token without a Sesión and returns the Turno', async () => {
        const fetchSpy = respond(201, verified);

        await expect(repo().verifyBooking('abc')).resolves.toEqual(verified);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'abc' }),
        });
    });

    it('translates a 422 to BookingStateError', async () => {
        respond(422, { statusCode: 422, message: 'Unknown, used or expired verification token' });
        await expect(repo().verifyBooking('abc')).rejects.toBeInstanceOf(BookingStateError);
    });

    it('translates a 409 to SlotTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Overlaps a booked Turno for this Employee' });
        await expect(repo().verifyBooking('abc')).rejects.toBeInstanceOf(SlotTakenError);
    });
});

describe('BookingsRepository spans', () => {
    it('runs each method inside a span named after the repository and the method', async () => {
        const names: string[] = [];
        const spanning = new BookingsRepository({ startSpan: (options, callback) => (names.push(options.name), callback()) }, 'http://api');
        respond(404, { message: 'nope' });
        await spanning.verifyBooking('abc').catch(() => undefined);
        await spanning.book({} as never).catch(() => undefined);
        await spanning.listSlots({ serviceId: 1, from: 'a', to: 'b' }).catch(() => undefined);
        expect(names).toEqual([
            'BookingsRepository > verifyBooking',
            'BookingsRepository > book',
            'BookingsRepository > listSlots',
        ]);
    });
});
