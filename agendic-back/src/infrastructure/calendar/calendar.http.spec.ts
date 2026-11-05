import { CalendarAccessRevokedError } from '../../domain/calendar/calendar-events';
import { ExternalServiceError, NotConfiguredError } from '../../domain/errors';
import {
  ANA,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  DAY_MS,
  scriptSession,
  TestApp,
} from '../../test-app';

const RETURN_URL = 'https://app.agendic.test/panel/calendario';
const CONNECTION = {
  provider: 'GOOGLE' as const,
  email: 'ana@gmail.com',
  status: 'CONNECTED' as const,
  connectedAt: new Date('2025-12-20T10:00:00.000Z'),
};

describe('Calendario conectado', () => {
  let t: TestApp;
  const original = { ...process.env };

  beforeEach(async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      'https://api.agendic.test/calendar-oauth/google/callback';
    process.env.CALENDAR_RETURN_URL = RETURN_URL;
    process.env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
    t = await createTestApp();
    scriptSession(t);
    t.calendarOauth.authorizationUrl.mockImplementation(
      (provider, state) =>
        provider === 'MICROSOFT'
          ? `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=${state}`
          : `https://accounts.google.com/auth?state=${state}`,
    );
  });
  afterEach(async () => {
    process.env = { ...original };
    await t.app.close();
  });

  const get = () => t.http.get('/users/me/calendar').set(bearer(CLERK_TOKEN));
  const start = () =>
    t.http.post('/users/me/calendar/google').set(bearer(CLERK_TOKEN));
  const remove = () =>
    t.http.delete('/users/me/calendar').set(bearer(CLERK_TOKEN));
  const callback = (query: Record<string, string>) =>
    t.http.get('/calendar-oauth/google/callback').query(query);

  /** El `state` que el back le dio a Ana al arrancar. */
  const stateOfAna = async () => {
    t.calendarConnections.findByUserId.mockResolvedValue(null);
    const res = await start().expect(200);
    return new URL(res.body.authorizationUrl).searchParams.get('state')!;
  };

  const grant = {
    refreshToken: 'refresh-secret',
    email: 'ana@gmail.com',
    scopes: ['calendar'],
  };

  describe('GET /users/me/calendar', () => {
    it('answers null connection before the Usuario connected one', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(null);

      const res = await get().expect(200);

      expect(res.body).toEqual({ connection: null });
    });

    it('answers the connection without the token', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);

      const res = await get().expect(200);

      expect(res.body).toEqual({
        connection: {
          provider: 'GOOGLE',
          email: 'ana@gmail.com',
          status: 'CONNECTED',
          connectedAt: '2025-12-20T10:00:00.000Z',
        },
      });
    });

    it('exposes a DISCONNECTED connection', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        status: 'DISCONNECTED',
      });

      const res = await get().expect(200);

      expect(res.body.connection.status).toBe('DISCONNECTED');
    });

    it('is 401 without a Sesión', async () => {
      await t.http.get('/users/me/calendar').expect(401);
    });
  });

  describe('POST /users/me/calendar/google', () => {
    it('answers the Google authorization URL with a signed state', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(null);

      const res = await start().expect(200);

      expect(res.body.authorizationUrl).toMatch(
        /^https:\/\/accounts\.google\.com\/auth\?state=.+/,
      );
    });

    it('is 409 when the Usuario already has a CONNECTED Calendario', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);

      const res = await start().expect(409);

      expect(res.body.message).toBe(
        `Calendar already connected for User ${ANA.id}`,
      );
    });

    it('lets a DISCONNECTED Calendario be connected again', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        status: 'DISCONNECTED',
      });

      await start().expect(200);
    });

    it('is 503 when the environment has no Google OAuth credentials', async () => {
      t.calendarOauth.assertConfigured.mockImplementation(() => {
        throw new NotConfiguredError('Calendario conectado no configurado');
      });

      await start().expect(503);
    });

    it('is 401 without a Sesión', async () => {
      await t.http.post('/users/me/calendar/google').expect(401);
    });
  });

  describe('GET /calendar-oauth/google/callback', () => {
    const location = (res: { headers: Record<string, string> }) =>
      new URL(res.headers.location);

    it('stores the connection of the Usuario in the state and goes back with calendar=connected', async () => {
      const state = await stateOfAna();
      t.calendarOauth.exchangeCode.mockResolvedValue(grant);

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).origin + location(res).pathname).toBe(RETURN_URL);
      expect(location(res).searchParams.get('calendar')).toBe('connected');
      expect(t.calendarOauth.exchangeCode).toHaveBeenCalledWith(
        'GOOGLE',
        'abc',
      );
      expect(t.calendarConnections.save).toHaveBeenCalledWith(ANA.id, {
        provider: 'GOOGLE',
        email: 'ana@gmail.com',
        refreshToken: 'refresh-secret',
        connectedAt: t.clock.now(),
      });
    });

    it('goes back with calendar=denied when the Usuario refused the permission', async () => {
      const state = await stateOfAna();

      const res = await callback({ error: 'access_denied', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('denied');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('goes back with calendar=missing-scope when the Calendar permission was unticked', async () => {
      const state = await stateOfAna();
      t.calendarOauth.exchangeCode.mockResolvedValue(grant);
      t.calendarOauth.hasRequiredScopes.mockReturnValue(false);

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('missing-scope');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('goes back with calendar=error when the code exchange fails', async () => {
      const state = await stateOfAna();
      t.calendarOauth.exchangeCode.mockRejectedValue(
        new ExternalServiceError('Google OAuth code exchange failed'),
      );

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('error');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('connects nothing with a tampered state', async () => {
      const [payload, signature] = (await stateOfAna()).split('.');
      const forged = Buffer.from(
        JSON.stringify({
          userId: 2,
          expiresAt: t.clock.now().getTime() + DAY_MS,
        }),
      ).toString('base64url');

      for (const state of [
        `${forged}.${signature}`,
        `${payload}.x`,
        'garbage',
      ]) {
        const res = await callback({ code: 'abc', state }).expect(302);
        expect(location(res).searchParams.get('calendar')).toBe('error');
      }
      expect(t.calendarOauth.exchangeCode).not.toHaveBeenCalled();
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('connects nothing with an expired state', async () => {
      const state = await stateOfAna();
      t.clock.advance(11 * 60 * 1000);

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('error');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('goes back with calendar=error without state', async () => {
      const res = await callback({ code: 'abc' }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('error');
    });

    it('is 503 when the environment has no Google OAuth credentials', async () => {
      t.calendarOauth.assertConfigured.mockImplementation(() => {
        throw new NotConfiguredError('Calendario conectado no configurado');
      });

      await callback({ code: 'abc', state: 'x' }).expect(503);
    });
  });

  describe('calendarios que cuentan como ocupado', () => {
    const CALENDARS = [
      { id: 'ana@gmail.com', name: 'Ana', primary: true },
      {
        id: 'trabajo@group.calendar.google.com',
        name: 'Trabajo',
        primary: false,
      },
      {
        id: 'familia@group.calendar.google.com',
        name: 'Familia',
        primary: false,
      },
    ];
    const ticks = (res: { body: { calendars: { checked: boolean }[] } }) =>
      res.body.calendars.map((calendar) => calendar.checked);
    const list = () =>
      t.http.get('/users/me/calendar/calendars').set(bearer(CLERK_TOKEN));
    const save = (body: object) =>
      t.http
        .put('/users/me/calendar/calendars')
        .set(bearer(CLERK_TOKEN))
        .send(body);

    beforeEach(() => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'GOOGLE',
        refreshToken: 'refresh',
      });
      t.calendarConnections.findCheckedCalendarIdsByUserId.mockResolvedValue([
        'primary',
      ]);
      t.calendarEvents.listCalendars.mockResolvedValue(CALENDARS);
    });

    describe('GET /users/me/calendar/calendars', () => {
      it('ticks only the primary calendar of a new connection', async () => {
        const res = await list().expect(200);

        expect(t.calendarEvents.listCalendars).toHaveBeenCalledWith({
          provider: 'GOOGLE',
          refreshToken: 'refresh',
        });
        expect(res.body).toEqual({
          calendars: [
            { ...CALENDARS[0], checked: true },
            { ...CALENDARS[1], checked: false },
            { ...CALENDARS[2], checked: false },
          ],
        });
      });

      it('ticks the calendars the Usuario chose', async () => {
        t.calendarConnections.findCheckedCalendarIdsByUserId.mockResolvedValue([
          CALENDARS[1].id,
        ]);

        expect(ticks(await list().expect(200))).toEqual([false, true, false]);
      });

      it('leaves out a ticked calendar that left the account, without an error', async () => {
        t.calendarConnections.findCheckedCalendarIdsByUserId.mockResolvedValue([
          'borrado@group.calendar.google.com',
        ]);

        const res = await list().expect(200);

        expect(res.body.calendars).toHaveLength(3);
        expect(ticks(res)).toEqual([false, false, false]);
      });

      it('is 404 without a Calendario conectado', async () => {
        t.calendarConnections.findByUserId.mockResolvedValue(null);

        const res = await list().expect(404);

        expect(res.body.message).toBe(
          `User ${ANA.id} has no Calendario conectado`,
        );
      });

      it('is 409 when the Calendario conectado is DISCONNECTED', async () => {
        t.calendarConnections.findByUserId.mockResolvedValue({
          ...CONNECTION,
          status: 'DISCONNECTED',
        });

        const res = await list().expect(409);

        expect(res.body.message).toBe(
          `Calendario conectado of User ${ANA.id} is disconnected`,
        );
        expect(t.calendarEvents.listCalendars).not.toHaveBeenCalled();
      });

      it('is 409 and marks it DISCONNECTED when Google rejects the token', async () => {
        t.calendarEvents.listCalendars.mockRejectedValue(
          new CalendarAccessRevokedError('revoked'),
        );

        await list().expect(409);

        expect(t.calendarConnections.markDisconnected).toHaveBeenCalledWith(
          ANA.id,
        );
      });

      it('is 502 when Google does not answer', async () => {
        t.calendarEvents.listCalendars.mockRejectedValue(
          new ExternalServiceError('Google Calendar not reachable'),
        );

        await list().expect(502);
      });

      it('is 401 without a Sesión', async () => {
        await t.http.get('/users/me/calendar/calendars').expect(401);
      });
    });

    describe('PUT /users/me/calendar/calendars', () => {
      it('saves the ticked calendars and answers like the GET', async () => {
        const res = await save({
          checkedIds: [CALENDARS[0].id, CALENDARS[2].id],
        }).expect(200);

        expect(
          t.calendarConnections.saveCheckedCalendarIds,
        ).toHaveBeenCalledWith(ANA.id, [CALENDARS[0].id, CALENDARS[2].id]);
        expect(ticks(res)).toEqual([true, false, true]);
      });

      it('accepts an empty list: no calendar is read', async () => {
        const res = await save({ checkedIds: [] }).expect(200);

        expect(
          t.calendarConnections.saveCheckedCalendarIds,
        ).toHaveBeenCalledWith(ANA.id, []);
        expect(ticks(res)).toEqual([false, false, false]);
      });

      it('is 422 with an id that is not in the connected account', async () => {
        const res = await save({
          checkedIds: [CALENDARS[0].id, 'ajeno@group.calendar.google.com'],
        }).expect(422);

        expect(res.body.message).toBe(
          'Calendar ajeno@group.calendar.google.com is not in the connected account',
        );
        expect(
          t.calendarConnections.saveCheckedCalendarIds,
        ).not.toHaveBeenCalled();
      });

      it('is 400 without a list of ids', async () => {
        await save({}).expect(400);
        await save({ checkedIds: 'x' }).expect(400);
        await save({ checkedIds: [1] }).expect(400);
      });

      it('is 404 without a Calendario conectado', async () => {
        t.calendarConnections.findByUserId.mockResolvedValue(null);

        await save({ checkedIds: [] }).expect(404);
      });

      it('is 409 when the Calendario conectado is DISCONNECTED', async () => {
        t.calendarConnections.findByUserId.mockResolvedValue({
          ...CONNECTION,
          status: 'DISCONNECTED',
        });

        await save({ checkedIds: [] }).expect(409);
        expect(
          t.calendarConnections.saveCheckedCalendarIds,
        ).not.toHaveBeenCalled();
      });

      it('is 502 when Google does not answer', async () => {
        t.calendarEvents.listCalendars.mockRejectedValue(
          new ExternalServiceError('Google Calendar not reachable'),
        );

        await save({ checkedIds: [] }).expect(502);
        expect(
          t.calendarConnections.saveCheckedCalendarIds,
        ).not.toHaveBeenCalled();
      });

      it('is 401 without a Sesión', async () => {
        await t.http
          .put('/users/me/calendar/calendars')
          .send({ checkedIds: [] })
          .expect(401);
      });
    });
  });

  describe('DELETE /users/me/calendar', () => {
    it('revokes the token in Google, deletes the connection and answers 204', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'GOOGLE',
        refreshToken: 'refresh-secret',
      });

      await remove().expect(204);

      expect(t.calendarOauth.revoke).toHaveBeenCalledWith(
        'GOOGLE',
        'refresh-secret',
      );
      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });

    it('deletes the connection even when Google fails to revoke the token', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'GOOGLE',
        refreshToken: 'refresh-secret',
      });
      t.calendarOauth.revoke.mockRejectedValue(
        new ExternalServiceError('down'),
      );

      await remove().expect(204);

      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });

    it('deletes the connection even when the stored token cannot be decrypted', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);
      t.calendarConnections.findCredentialsByUserId.mockRejectedValue(
        new Error('Unsupported state or unable to authenticate data'),
      );

      await remove().expect(204);

      expect(t.calendarOauth.revoke).not.toHaveBeenCalled();
      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });

    it('is 404 when the Usuario has no Calendario conectado', async () => {
      const res = await remove().expect(404);

      expect(res.body.message).toBe(
        `User ${ANA.id} has no Calendario conectado`,
      );
      expect(t.calendarOauth.revoke).not.toHaveBeenCalled();
    });

    it('is 401 without a Sesión', async () => {
      await t.http.delete('/users/me/calendar').expect(401);
    });
  });

  describe('DELETE /users/me', () => {
    it('disconnects the Calendario conectado of the Usuario dado de baja', async () => {
      t.users.findById.mockResolvedValue(ANA);
      t.users.retire.mockResolvedValue({ cancelledBookings: [] });
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'GOOGLE',
        refreshToken: 'refresh-secret',
      });

      await t.http.delete('/users/me').set(bearer(CLERK_TOKEN)).expect(204);

      expect(t.calendarOauth.revoke).toHaveBeenCalledWith(
        'GOOGLE',
        'refresh-secret',
      );
      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });
  });
  describe('Microsoft', () => {
    const startMicrosoft = () =>
      t.http.post('/users/me/calendar/microsoft').set(bearer(CLERK_TOKEN));
    const callbackMicrosoft = (query: Record<string, string>) =>
      t.http.get('/calendar-oauth/microsoft/callback').query(query);
    const location = (res: { headers: Record<string, string> }) =>
      new URL(res.headers.location);
    const microsoftGrant = {
      refreshToken: 'ms-refresh',
      email: 'ana@outlook.com',
      scopes: ['Calendars.ReadWrite'],
    };
    const stateOfAnaMicrosoft = async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(null);
      const res = await startMicrosoft().expect(200);
      return new URL(res.body.authorizationUrl).searchParams.get('state')!;
    };

    it('POST /users/me/calendar/microsoft answers the Microsoft authorization URL', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(null);

      const res = await startMicrosoft().expect(200);

      expect(res.body.authorizationUrl).toMatch(
        /^https:\/\/login\.microsoftonline\.com\/.+state=.+/,
      );
      expect(t.calendarOauth.assertConfigured).toHaveBeenCalledWith('MICROSOFT');
    });

    it('POST /users/me/calendar/microsoft is 409 when a Google Calendario is CONNECTED', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue(CONNECTION);

      const res = await startMicrosoft().expect(409);

      expect(res.body.message).toBe(
        `Calendar already connected for User ${ANA.id}`,
      );
    });

    it('POST /users/me/calendar/microsoft is 503 without Microsoft OAuth credentials', async () => {
      t.calendarOauth.assertConfigured.mockImplementation(() => {
        throw new NotConfiguredError('Calendario conectado no configurado');
      });

      await startMicrosoft().expect(503);
    });

    it('POST /users/me/calendar/microsoft is 401 without a Sesión', async () => {
      await t.http.post('/users/me/calendar/microsoft').expect(401);
    });

    it('GET /users/me/calendar answers provider MICROSOFT', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        provider: 'MICROSOFT',
        email: 'ana@outlook.com',
      });

      const res = await get().expect(200);

      expect(res.body.connection.provider).toBe('MICROSOFT');
    });

    it('the callback stores a Microsoft connection and goes back with calendar=connected', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarOauth.exchangeCode.mockResolvedValue(microsoftGrant);

      const res = await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(location(res).origin + location(res).pathname).toBe(RETURN_URL);
      expect(location(res).searchParams.get('calendar')).toBe('connected');
      expect(t.calendarOauth.exchangeCode).toHaveBeenCalledWith('MICROSOFT', 'abc');
      expect(t.calendarConnections.save).toHaveBeenCalledWith(ANA.id, {
        provider: 'MICROSOFT',
        email: 'ana@outlook.com',
        refreshToken: 'ms-refresh',
        connectedAt: t.clock.now(),
      });
    });

    it.each(['access_denied', 'consent_required'])(
      'the callback goes back with calendar=denied on %s (a company that needs its administrator)',
      async (error) => {
        const state = await stateOfAnaMicrosoft();

        const res = await callbackMicrosoft({ error, state }).expect(302);

        expect(location(res).searchParams.get('calendar')).toBe('denied');
        expect(t.calendarConnections.save).not.toHaveBeenCalled();
      },
    );

    it('the callback goes back with calendar=missing-scope when the calendar permission was not given', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarOauth.exchangeCode.mockResolvedValue(microsoftGrant);
      t.calendarOauth.hasRequiredScopes.mockReturnValue(false);

      const res = await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('missing-scope');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('the callback goes back with calendar=error when the code exchange fails', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarOauth.exchangeCode.mockRejectedValue(
        new ExternalServiceError('Microsoft OAuth code exchange failed'),
      );

      const res = await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('error');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('connecting Microsoft over a DISCONNECTED Google first tries to delete the future Eventos del Turno with the old token', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        status: 'DISCONNECTED',
      });
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'GOOGLE',
        refreshToken: 'google-refresh',
      });
      t.bookingCalendarEvents.listFutureByUserId.mockResolvedValue([
        { bookingId: 5, userId: ANA.id, googleEventId: 'g-5', fingerprint: 'x' },
      ]);
      t.calendarEvents.deleteEvent.mockRejectedValue(
        new CalendarAccessRevokedError('revoked'),
      );
      t.calendarOauth.exchangeCode.mockResolvedValue(microsoftGrant);

      const res = await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('connected');
      expect(t.calendarEvents.deleteEvent).toHaveBeenCalledWith(
        { provider: 'GOOGLE', refreshToken: 'google-refresh' },
        'g-5',
      );
      // The attempt failed: the event stays in Google, but Agendic forgets it and saves the new connection.
      expect(t.bookingCalendarEvents.deleteByUserId).toHaveBeenCalledWith(ANA.id);
      expect(t.calendarConnections.save).toHaveBeenCalledWith(
        ANA.id,
        expect.objectContaining({ provider: 'MICROSOFT' }),
      );
    });

    it('reconnecting the same account does not touch the Eventos del Turno', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        provider: 'MICROSOFT',
        email: microsoftGrant.email,
        status: 'DISCONNECTED',
      });
      t.calendarOauth.exchangeCode.mockResolvedValue(microsoftGrant);

      await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(t.bookingCalendarEvents.deleteByUserId).not.toHaveBeenCalled();
      expect(t.calendarConnections.save).toHaveBeenCalled();
    });

    it('connecting another account of the same provider forgets the Eventos del Turno so the job writes them in the new one', async () => {
      const state = await stateOfAnaMicrosoft();
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        provider: 'MICROSOFT',
        email: 'ana@vieja.com',
        status: 'DISCONNECTED',
      });
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'MICROSOFT',
        refreshToken: 'old-refresh',
      });
      t.bookingCalendarEvents.listFutureByUserId.mockResolvedValue([]);
      t.calendarOauth.exchangeCode.mockResolvedValue(microsoftGrant);

      await callbackMicrosoft({ code: 'abc', state }).expect(302);

      expect(t.bookingCalendarEvents.deleteByUserId).toHaveBeenCalledWith(ANA.id);
      expect(t.calendarConnections.save).toHaveBeenCalled();
    });

    it('DELETE /users/me/calendar revokes with the provider of the connection', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        provider: 'MICROSOFT',
      });
      t.calendarConnections.findCredentialsByUserId.mockResolvedValue({
        provider: 'MICROSOFT',
        refreshToken: 'ms-refresh',
      });

      await remove().expect(204);

      expect(t.calendarOauth.revoke).toHaveBeenCalledWith('MICROSOFT', 'ms-refresh');
    });
  });
});
