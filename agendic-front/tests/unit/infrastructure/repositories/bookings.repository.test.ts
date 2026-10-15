import {
    InvalidVerificationCodeError,
    SeriesDatesUnavailableError,
    SeriesTooShortError,
    SlotTakenError,
    SlotUnavailableError,
    TooManyVerificationCodeRequestsError,
} from '@/src/entities/errors/booking';
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

    it('asks only for the Horarios reservables of the Empleado elegido', async () => {
        const fetchSpy = respond(200, { timeZone: 'UTC', days: [] });

        await repo().listSlots({ ...query, employeeId: 3 });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/services/100/slots?from=2026-09-28&to=2026-10-11&employeeId=3', {});
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
        code: 'ABC123',
    };
    const booking = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'BOOKED',
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

    it('translates a 409 por Límite diario a SlotTakenError también', async () => {
        respond(409, { statusCode: 409, message: 'The Service reached its Límite diario that day' });
        await expect(repo().book(input)).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().book(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 400 to InvalidVerificationCodeError, keeping the message', async () => {
        respond(400, { statusCode: 400, message: 'Invalid or expired verification code for juana@example.com' });
        const error = await repo().book(input).catch((e) => e);
        expect(error).toBeInstanceOf(InvalidVerificationCodeError);
        expect(error.message).toBe('Invalid or expired verification code for juana@example.com');
    });

    it.each([422, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
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

describe('BookingsRepository.book of a Serie', () => {
    const input = {
        serviceId: 100,
        startsAt: '2026-09-28T12:00:00.000Z',
        clientName: 'Juana Pérez',
        clientEmail: 'juana@example.com',
        code: 'ABC123',
        repeat: { count: 4, skipDates: ['2026-10-12'] },
    };
    const booking = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'BOOKED',
        link: 'l1nk-1',
        series: {
            id: 'serie-1',
            bookings: [
                { startsAt: '2026-09-28T12:00:00.000Z', link: 'l1nk-1' },
                { startsAt: '2026-10-05T12:00:00.000Z', link: 'l1nk-2' },
            ],
        },
    };

    it('POSTs the repeat and returns the first Turno with its Serie', async () => {
        const fetchSpy = respond(201, booking);

        await expect(repo().book(input)).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings', expect.objectContaining({ body: JSON.stringify(input) }));
    });

    it('translates the 409 of the Serie to SeriesDatesUnavailableError with its dates', async () => {
        respond(409, { statusCode: 409, message: 'Series dates not available: 2026-10-05,2026-10-19' });

        const error = await repo().book(input).catch((e) => e);
        expect(error).toBeInstanceOf(SeriesDatesUnavailableError);
        expect(error.dates).toEqual(['2026-10-05', '2026-10-19']);
    });

    it('translates the 422 of a Serie left with less than 2 Turnos to SeriesTooShortError', async () => {
        respond(422, { statusCode: 422, message: 'A Serie needs at least 2 Turnos' });
        await expect(repo().book(input)).rejects.toBeInstanceOf(SeriesTooShortError);
    });

    it.each(['count must be between 2 and 4', 'skipDates are not dates of the Serie: 2026-10-13'])(
        'keeps the 400 %j as ApiRequestError, not as an invalid code',
        async (message) => {
            respond(400, { statusCode: 400, message });
            const error = await repo().book(input).catch((e) => e);
            expect(error).toBeInstanceOf(ApiRequestError);
            expect(error).not.toBeInstanceOf(InvalidVerificationCodeError);
        },
    );
});

describe('BookingsRepository.listSeriesSlots', () => {
    const query = { serviceId: 100, startsAt: '2026-09-28T12:00:00.000Z', count: 3 };
    const seriesSlots = {
        employeeId: 1,
        dates: [
            { date: '2026-09-28', startsAt: '2026-09-28T12:00:00.000Z', available: true },
            { date: '2026-10-05', startsAt: '2026-10-05T12:00:00.000Z', available: false },
            { date: '2026-10-12', startsAt: '2026-10-12T12:00:00.000Z', available: true },
        ],
    };

    it('GETs the dates of the Serie, without a Sesión', async () => {
        const fetchSpy = respond(200, seriesSlots);

        await expect(repo().listSeriesSlots(query)).resolves.toEqual(seriesSlots);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100/series-slots?startsAt=2026-09-28T12%3A00%3A00.000Z&count=3',
            expect.anything(),
        );
    });

    it('asks for the dates with the Empleado elegido', async () => {
        const fetchSpy = respond(200, seriesSlots);
        await repo().listSeriesSlots({ ...query, employeeId: 5 });
        expect(String(fetchSpy.mock.calls[0][0])).toContain('employeeId=5');
    });

    it('translates the 422 of a first horario no longer reservable to SlotUnavailableError', async () => {
        respond(422, { statusCode: 422, message: 'Slot 2026-09-28T12:00:00.000Z is not available for Service 100' });
        await expect(repo().listSeriesSlots(query)).rejects.toBeInstanceOf(SlotUnavailableError);
    });
});

describe('BookingsRepository.requestVerificationCode', () => {
    it('POSTs the email without a Sesión, sin devolver nada', async () => {
        const fetchSpy = respond(204, undefined);

        await expect(repo().requestVerificationCode('juana@example.com')).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'juana@example.com' }),
        });
    });

    it('translates a 429 to TooManyVerificationCodeRequestsError, keeping the message', async () => {
        respond(429, { statusCode: 429, message: 'Too many verification codes requested for juana@example.com' });
        const error = await repo().requestVerificationCode('juana@example.com').catch((e) => e);
        expect(error).toBeInstanceOf(TooManyVerificationCodeRequestsError);
        expect(error.message).toBe('Too many verification codes requested for juana@example.com');
    });
});

describe('BookingsRepository spans', () => {
    it('runs each method inside a span named after the repository and the method', async () => {
        const names: string[] = [];
        const spanning = new BookingsRepository({ startSpan: (options, callback) => (names.push(options.name), callback()) }, 'http://api');
        respond(404, { message: 'nope' });
        await spanning.requestVerificationCode('juana@example.com').catch(() => undefined);
        await spanning.book({} as never).catch(() => undefined);
        await spanning.listSlots({ serviceId: 1, from: 'a', to: 'b' }).catch(() => undefined);
        expect(names).toEqual([
            'BookingsRepository > requestVerificationCode',
            'BookingsRepository > book',
            'BookingsRepository > listSlots',
        ]);
    });
});
