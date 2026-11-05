import { CalendarAccessRevokedError } from '../../domain/calendar/calendar-events';
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

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).resolves.toEqual([
      {
        start: new Date('2026-01-02T16:00:00.000Z'),
        end: new Date('2026-01-02T17:00:00.000Z'),
      },
    ]);
  });

  it('un evento de día entero ocupa ese día en la zona del calendario', async () => {
    answerWith([
      { start: { date: '2026-01-02' }, end: { date: '2026-01-03' } },
    ]);

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).resolves.toEqual([
      {
        start: new Date('2026-01-02T03:00:00.000Z'),
        end: new Date('2026-01-03T03:00:00.000Z'),
      },
    ]);
  });

  it('pide el rango y los eventos ya expandidos, con el access token', async () => {
    answerWith([]);

    await client.listBusy('refresh', ['primary'], from, to);

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain('singleEvents=true');
    expect(String(url)).toContain(
      `timeMin=${encodeURIComponent(from.toISOString())}`,
    );
    expect(init?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('un invalid_grant es CalendarAccessRevokedError', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400));

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).rejects.toThrow(CalendarAccessRevokedError);
  });

  it('un error de Google al leer los eventos es ExternalServiceError', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({}, 500));

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).rejects.toThrow(ExternalServiceError);
  });

  it('lista los calendarios con el principal primero y el nombre que el Usuario les puso', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(
        json({
          items: [
            { id: 'trabajo', summary: 'Trabajo' },
            {
              id: 'ana@gmail.com',
              summary: 'ana@gmail.com',
              summaryOverride: 'Ana',
              primary: true,
            },
          ],
        }),
      );

    await expect(client.listCalendars('refresh')).resolves.toEqual([
      { id: 'ana@gmail.com', name: 'Ana', primary: true },
      { id: 'trabajo', name: 'Trabajo', primary: false },
    ]);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/users/me/calendarList',
    );
  });

  it('lee los eventos de cada calendario tildado, con su id en la dirección', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({ items: [{ start: at(13), end: at(14) }] }))
      .mockResolvedValueOnce(json({ items: [{ start: at(15), end: at(16) }] }));

    const busy = await client.listBusy(
      'refresh',
      ['a@x.com', 'trabajo#1'],
      from,
      to,
    );

    expect(busy).toHaveLength(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/calendars/a%40x.com/events',
    );
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      '/calendars/trabajo%231/events',
    );
  });

  it('ignora un calendario tildado que ya no existe', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ items: [{ start: at(15), end: at(16) }] }));

    await expect(
      client.listBusy('refresh', ['borrado', 'primary'], from, to),
    ).resolves.toHaveLength(1);
  });

  describe('Eventos del Turno', () => {
    const content = {
      bookingId: 7,
      title: 'Corte · Ana',
      description: 'Peluquería',
      location: 'Calle 1',
      start: new Date('2026-01-02T15:00:00.000Z'),
      end: new Date('2026-01-02T16:00:00.000Z'),
      attendeeEmail: 'ana@example.com',
    };
    const sentBody = () =>
      JSON.parse(fetchMock.mock.calls[1][1]!.body as string);

    it('crea el evento en el calendario principal con el Cliente invitado, sin mail de Google y con la marca de Agendic', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt' }));

      await expect(client.createEvent('refresh', content)).resolves.toBe('evt');

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none',
      );
      expect(init?.method).toBe('POST');
      expect(sentBody()).toMatchObject({
        summary: 'Corte · Ana',
        location: 'Calle 1',
        start: { dateTime: '2026-01-02T15:00:00.000Z' },
        attendees: [{ email: 'ana@example.com' }],
        extendedProperties: { private: { agendicBookingId: '7' } },
      });
    });

    it('falla con ExternalServiceError si Google rechaza la creación', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 500));

      await expect(client.createEvent('refresh', content)).rejects.toThrow(
        ExternalServiceError,
      );
    });

    it('actualiza el evento, y dice que no está si Google no lo encuentra', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt', status: 'confirmed' }));
      await expect(client.updateEvent('refresh', 'evt', content)).resolves.toBe(
        true,
      );
      expect(fetchMock.mock.calls[1][1]?.method).toBe('PATCH');

      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 404));
      await expect(client.updateEvent('refresh', 'evt', content)).resolves.toBe(
        false,
      );
    });

    it('un evento que Google conserva como cancelado cuenta como borrado', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt', status: 'cancelled' }));

      await expect(client.updateEvent('refresh', 'evt', content)).resolves.toBe(
        false,
      );
    });

    it('borra el evento, y no falla si ya no existe', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 410));

      await expect(
        client.deleteEvent('refresh', 'evt'),
      ).resolves.toBeUndefined();
      expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
    });
  });
});
