import { CalendarAccessRevokedError } from '../../domain/calendar/google-calendar-events';
import { ExternalServiceError } from '../../domain/errors';
import { GoogleCalendarEventsClient } from './google-calendar-events.client';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const at = (hour: number) => ({ dateTime: `2026-01-02T${hour}:00:00-03:00` });

describe('GoogleCalendarEventsClient', () => {
  const client = new GoogleCalendarEventsClient();
  const env = { ...process.env };
  const from = new Date('2026-01-02T00:00:00.000Z');
  const to = new Date('2026-01-03T00:00:00.000Z');
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost/callback';
    process.env.CALENDAR_RETURN_URL = 'http://localhost/back';
    process.env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 1).toString('base64');
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    fetchMock.mockRestore();
    process.env = { ...env };
  });

  const answerWith = (items: unknown[]) =>
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(
        json({ items, timeZone: 'America/Argentina/Buenos_Aires' }),
      );

  it('cuenta los eventos ocupados y deja los transparentes, los cancelados y los Eventos del Turno', async () => {
    answerWith([
      { start: at(13), end: at(14) },
      { transparency: 'transparent', start: at(15), end: at(16) },
      { status: 'cancelled', start: at(17), end: at(18) },
      {
        extendedProperties: { private: { agendicBookingId: '7' } },
        start: at(19),
        end: at(20),
      },
    ]);

    await expect(client.listBusy('refresh', from, to)).resolves.toEqual([
      {
        start: new Date('2026-01-02T16:00:00.000Z'),
        end: new Date('2026-01-02T17:00:00.000Z'),
      },
    ]);
  });

  it('un evento de día entero ocupa ese día en la zona del calendario', async () => {
    answerWith([{ start: { date: '2026-01-02' }, end: { date: '2026-01-03' } }]);

    await expect(client.listBusy('refresh', from, to)).resolves.toEqual([
      {
        start: new Date('2026-01-02T03:00:00.000Z'),
        end: new Date('2026-01-03T03:00:00.000Z'),
      },
    ]);
  });

  it('pide el rango y los eventos ya expandidos, con el access token', async () => {
    answerWith([]);

    await client.listBusy('refresh', from, to);

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain('singleEvents=true');
    expect(String(url)).toContain(
      `timeMin=${encodeURIComponent(from.toISOString())}`,
    );
    expect(init?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('un invalid_grant es CalendarAccessRevokedError', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400));

    await expect(client.listBusy('refresh', from, to)).rejects.toThrow(
      CalendarAccessRevokedError,
    );
  });

  it('un error de Google al leer los eventos es ExternalServiceError', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({}, 500));

    await expect(client.listBusy('refresh', from, to)).rejects.toThrow(
      ExternalServiceError,
    );
  });
});
