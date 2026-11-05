import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { CalendarAlreadyConnectedError, CalendarNotConfiguredError } from '@/src/entities/errors/calendar';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { CalendarConnectionsRepository } from '@/src/infrastructure/repositories/calendar-connections.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const conexion = { provider: 'GOOGLE', email: 'ana@gmail.com', status: 'CONNECTED', connectedAt: '2026-11-01T10:00:00.000Z' };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new CalendarConnectionsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, apiUrl);
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('CalendarConnectionsRepository.getConnection', () => {
    it('GETs the Calendario conectado with the bearer token', async () => {
        const fetchSpy = respond(200, { connection: conexion });

        await expect(repo().getConnection()).resolves.toEqual(conexion);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/calendar',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('returns null when the Usuario has none', async () => {
        respond(200, { connection: null });
        await expect(repo().getConnection()).resolves.toBeNull();
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'no' });
        await expect(repo().getConnection()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, { connection: { email: 1 } });
        const error = await repo().getConnection().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').getConnection()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('CalendarConnectionsRepository.startGoogleConnection', () => {
    it('POSTs and returns the authorization address', async () => {
        const fetchSpy = respond(200, { authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?x=1' });

        await expect(repo().startGoogleConnection()).resolves.toEqual({ authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?x=1' });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/calendar/google', expect.objectContaining({ method: 'POST' }));
    });

    it('translates a 409 to CalendarAlreadyConnectedError with the back message', async () => {
        respond(409, { message: 'Calendar already connected for User 3' });
        const error = await repo().startGoogleConnection().catch((e) => e);
        expect(error).toBeInstanceOf(CalendarAlreadyConnectedError);
        expect(error.message).toBe('Calendar already connected for User 3');
    });

    it('translates a 503 to CalendarNotConfiguredError', async () => {
        respond(503, { message: 'Google Calendar is not configured' });
        await expect(repo().startGoogleConnection()).rejects.toBeInstanceOf(CalendarNotConfiguredError);
    });

    it('translates an unexpected body to ApiRequestError', async () => {
        respond(200, { authorizationUrl: 'no es una url' });
        await expect(repo().startGoogleConnection()).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('CalendarConnectionsRepository.startMicrosoftConnection', () => {
    it('POSTs to the Microsoft path and returns the authorization address', async () => {
        const fetchSpy = respond(200, { authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?x=1' });

        await expect(repo().startMicrosoftConnection()).resolves.toEqual({
            authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?x=1',
        });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/calendar/microsoft', expect.objectContaining({ method: 'POST' }));
    });

    it('translates a 409 to CalendarAlreadyConnectedError with the back message', async () => {
        respond(409, { message: 'Calendar already connected for User 3' });
        const error = await repo().startMicrosoftConnection().catch((e) => e);
        expect(error).toBeInstanceOf(CalendarAlreadyConnectedError);
        expect(error.message).toBe('Calendar already connected for User 3');
    });

    it('translates a 503 to CalendarNotConfiguredError', async () => {
        respond(503, { message: 'Calendario conectado no configurado' });
        await expect(repo().startMicrosoftConnection()).rejects.toBeInstanceOf(CalendarNotConfiguredError);
    });

    it('translates an unexpected body to ApiRequestError', async () => {
        respond(200, { authorizationUrl: 'no es una url' });
        await expect(repo().startMicrosoftConnection()).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('CalendarConnectionsRepository.disconnect', () => {
    it('DELETEs the Calendario conectado', async () => {
        const fetchSpy = respond(204);

        await expect(repo().disconnect()).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/calendar', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { message: 'User 3 has no Calendario conectado' });
        await expect(repo().disconnect()).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().disconnect()).rejects.toMatchObject({ status: 500 });
    });
});
