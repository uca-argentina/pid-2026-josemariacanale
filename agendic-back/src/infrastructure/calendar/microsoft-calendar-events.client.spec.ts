import { CalendarAccessRevokedError } from '../../domain/calendar/calendar-events';
import { ExternalServiceError } from '../../domain/errors';
import { MicrosoftCalendarEventsClient } from './microsoft-calendar-events.client';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/** Graph answers in UTC, without `Z` and with seven decimals, when asked with `Prefer: outlook.timezone="UTC"`. */
const at = (hour: number) => ({ dateTime: `2026-01-02T${hour}:00:00.0000000` });
const MARKER =
  'String {00020329-0000-0000-C000-000000000046} Name agendicBookingId';

describe('MicrosoftCalendarEventsClient', () => {
  const client = new MicrosoftCalendarEventsClient();
  const env = { ...process.env };
  const from = new Date('2026-01-02T00:00:00.000Z');
  const to = new Date('2026-01-03T00:00:00.000Z');
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.MICROSOFT_OAUTH_CLIENT_ID = 'id';
    process.env.MICROSOFT_OAUTH_CLIENT_SECRET = 'secret';
    process.env.MICROSOFT_OAUTH_REDIRECT_URI = 'http://localhost/callback';
    process.env.CALENDAR_RETURN_URL = 'http://localhost/back';
    process.env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 1).toString('base64');
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    fetchMock.mockRestore();
    process.env = { ...env };
  });

  const answerWith = (value: unknown[]) =>
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({ value }));

  it('cuenta los eventos ocupados y deja los disponibles, los cancelados y los Eventos del Turno', async () => {
    answerWith([
      { start: at(13), end: at(14), showAs: 'busy' },
      { start: at(14), end: at(15), showAs: 'tentative' },
      { start: at(15), end: at(16), showAs: 'free' },
      { start: at(17), end: at(18), showAs: 'busy', isCancelled: true },
      {
        start: at(19),
        end: at(20),
        showAs: 'busy',
        singleValueExtendedProperties: [{ id: MARKER, value: '7' }],
      },
    ]);

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).resolves.toEqual([
      {
        start: new Date('2026-01-02T13:00:00.000Z'),
        end: new Date('2026-01-02T14:00:00.000Z'),
      },
      {
        start: new Date('2026-01-02T14:00:00.000Z'),
        end: new Date('2026-01-02T15:00:00.000Z'),
      },
    ]);
  });

  it('un evento de día entero ocupa ese día, que Graph ya devuelve en UTC', async () => {
    answerWith([
      {
        showAs: 'oof',
        isAllDay: true,
        start: { dateTime: '2026-01-02T03:00:00.0000000' },
        end: { dateTime: '2026-01-03T03:00:00.0000000' },
      },
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

  it('pide el rango con las repeticiones expandidas, en UTC y con la marca de Agendic, con el access token', async () => {
    answerWith([]);

    await client.listBusy('refresh', ['primary'], from, to);

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain(
      'https://graph.microsoft.com/v1.0/me/calendar/calendarView?',
    );
    expect(String(url)).toContain(
      `startDateTime=${encodeURIComponent(from.toISOString())}`,
    );
    expect(String(url)).toContain(
      `endDateTime=${encodeURIComponent(to.toISOString())}`,
    );
    expect(decodeURIComponent(String(url))).toContain(`id eq '${MARKER}'`);
    expect(init?.headers).toEqual({
      Authorization: 'Bearer token',
      Prefer: 'outlook.timezone="UTC"',
    });
  });

  it('renueva el access token con el refresh token', async () => {
    answerWith([]);

    await client.listBusy('refresh', ['primary'], from, to);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    );
    expect(String(init?.body)).toContain('refresh_token=refresh');
    expect(String(init?.body)).toContain('grant_type=refresh_token');
  });

  it('sigue las páginas de eventos', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(
        json({
          value: [{ start: at(13), end: at(14), showAs: 'busy' }],
          '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next',
        }),
      )
      .mockResolvedValueOnce(
        json({ value: [{ start: at(15), end: at(16), showAs: 'busy' }] }),
      );

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).resolves.toHaveLength(2);
    expect(fetchMock.mock.calls[2][0]).toBe(
      'https://graph.microsoft.com/v1.0/next',
    );
  });

  it.each(['invalid_grant', 'interaction_required'])(
    'un %s es CalendarAccessRevokedError',
    async (error) => {
      fetchMock.mockResolvedValueOnce(json({ error }, 400));

      await expect(
        client.listBusy('refresh', ['primary'], from, to),
      ).rejects.toThrow(CalendarAccessRevokedError);
    },
  );

  it('un error de Graph al leer los eventos es ExternalServiceError', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({}, 500));

    await expect(
      client.listBusy('refresh', ['primary'], from, to),
    ).rejects.toThrow(ExternalServiceError);
  });

  it('lista los calendarios con el principal primero', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(
        json({
          value: [
            { id: 'trabajo=', name: 'Trabajo' },
            { id: 'AAMk=', name: 'Calendario', isDefaultCalendar: true },
          ],
        }),
      );

    await expect(client.listCalendars('refresh')).resolves.toEqual([
      { id: 'AAMk=', name: 'Calendario', primary: true },
      { id: 'trabajo=', name: 'Trabajo', primary: false },
    ]);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/me/calendars?');
  });

  it('lee los eventos de cada calendario tildado, con su id en la dirección, y el principal por su alias', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({ value: [{ start: at(13), end: at(14) }] }))
      .mockResolvedValueOnce(json({ value: [{ start: at(15), end: at(16) }] }));

    const busy = await client.listBusy(
      'refresh',
      ['trabajo=', 'primary'],
      from,
      to,
    );

    expect(busy).toHaveLength(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/me/calendars/trabajo%3D/calendarView',
    );
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      '/me/calendar/calendarView',
    );
  });

  it('ignora un calendario tildado que ya no existe', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: 'token' }))
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ value: [{ start: at(15), end: at(16) }] }));

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

    it('crea el evento en el calendario principal con el Cliente en la descripción y no como invitado, y con la marca de Agendic', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt' }, 201));

      await expect(client.createEvent('refresh', content)).resolves.toBe('evt');

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendar/events');
      expect(init?.method).toBe('POST');
      expect(sentBody()).toMatchObject({
        subject: 'Corte · Ana',
        location: { displayName: 'Calle 1' },
        start: { dateTime: '2026-01-02T15:00:00.000Z', timeZone: 'UTC' },
        singleValueExtendedProperties: [{ id: MARKER, value: '7' }],
      });
      // Graph can't send an event with attendees without mailing them: the Cliente isn't one.
      expect(sentBody()).not.toHaveProperty('attendees');
      expect(sentBody().body.content).toContain('Cliente: ana@example.com');
    });

    it('falla con ExternalServiceError si Graph rechaza la creación', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 500));

      await expect(client.createEvent('refresh', content)).rejects.toThrow(
        ExternalServiceError,
      );
    });

    it('actualiza el evento, y dice que no está si Graph no lo encuentra', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt' }));
      await expect(client.updateEvent('refresh', 'evt', content)).resolves.toBe(
        true,
      );
      expect(fetchMock.mock.calls[1][1]?.method).toBe('PATCH');
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://graph.microsoft.com/v1.0/me/events/evt',
      );

      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 404));
      await expect(client.updateEvent('refresh', 'evt', content)).resolves.toBe(
        false,
      );
    });

    it('al actualizar un Turno sin dirección deja vacío el lugar', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({ id: 'evt' }));

      await client.updateEvent('refresh', 'evt', { ...content, location: null });

      expect(sentBody().location).toEqual({ displayName: '' });
    });

    it('borra el evento, y no falla si ya no existe', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 404));

      await expect(
        client.deleteEvent('refresh', 'evt'),
      ).resolves.toBeUndefined();
      expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
    });

    it('falla con ExternalServiceError si Graph rechaza el borrado', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ access_token: 'token' }))
        .mockResolvedValueOnce(json({}, 500));

      await expect(client.deleteEvent('refresh', 'evt')).rejects.toThrow(
        ExternalServiceError,
      );
    });
  });
});
