import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { CalendarDisconnectedError, CalendarNotInAccountError, CalendarsUnavailableError } from '@/src/entities/errors/calendar';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { CalendarConnectionsRepository } from '@/src/infrastructure/repositories/calendar-connections.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const calendarios = [
    { id: 'ana@gmail.com', name: 'Ana', primary: true, checked: true },
    { id: 'trabajo@group.calendar.google.com', name: 'Trabajo', primary: false, checked: false },
];

const repo = () => new CalendarConnectionsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, 'http://api');
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('CalendarConnectionsRepository.listCalendars', () => {
    it('GETs the calendars of the connected account', async () => {
        const fetchSpy = respond(200, { calendars: calendarios });

        await expect(repo().listCalendars()).resolves.toEqual(calendarios);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/calendar/calendars', expect.objectContaining({ method: 'GET' }));
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'no' });
        await expect(repo().listCalendars()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it.each([
        [404, NotFoundError],
        [409, CalendarDisconnectedError],
        [502, CalendarsUnavailableError],
    ])('translates a %i to its error', async (status, ErrorClass) => {
        respond(status, { message: 'x' });
        await expect(repo().listCalendars()).rejects.toBeInstanceOf(ErrorClass);
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, { calendars: [{ id: 1 }] });
        const error = await repo()
            .listCalendars()
            .catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});

describe('CalendarConnectionsRepository.setCheckedCalendars', () => {
    it('PUTs the checked ids and returns the calendars as saved', async () => {
        const fetchSpy = respond(200, { calendars: calendarios });

        await expect(repo().setCheckedCalendars(['ana@gmail.com'])).resolves.toEqual(calendarios);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/calendar/calendars',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ checkedIds: ['ana@gmail.com'] }) }),
        );
    });

    it('sends an empty list', async () => {
        const fetchSpy = respond(200, { calendars: [] });

        await repo().setCheckedCalendars([]);
        expect(fetchSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ checkedIds: [] }) }));
    });

    it('translates a 422 to CalendarNotInAccountError with the back message', async () => {
        respond(422, { message: 'Calendar x is not in the connected account' });
        const error = await repo()
            .setCheckedCalendars(['x'])
            .catch((e) => e);
        expect(error).toBeInstanceOf(CalendarNotInAccountError);
        expect(error.message).toBe('Calendar x is not in the connected account');
    });

    it.each([
        [404, NotFoundError],
        [409, CalendarDisconnectedError],
        [502, CalendarsUnavailableError],
    ])('translates a %i to its error', async (status, ErrorClass) => {
        respond(status, { message: 'x' });
        await expect(repo().setCheckedCalendars([])).rejects.toBeInstanceOf(ErrorClass);
    });
});
