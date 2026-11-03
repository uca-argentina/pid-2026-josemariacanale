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
    t.googleOauth.authorizationUrl.mockImplementation(
      (state) => `https://accounts.google.com/auth?state=${state}`,
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

      expect(res.body.message).toBe(`Calendar already connected for User ${ANA.id}`);
    });

    it('lets a DISCONNECTED Calendario be connected again', async () => {
      t.calendarConnections.findByUserId.mockResolvedValue({
        ...CONNECTION,
        status: 'DISCONNECTED',
      });

      await start().expect(200);
    });

    it('is 503 when the environment has no Google OAuth credentials', async () => {
      t.googleOauth.assertConfigured.mockImplementation(() => {
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
      t.googleOauth.exchangeCode.mockResolvedValue(grant);

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).origin + location(res).pathname).toBe(RETURN_URL);
      expect(location(res).searchParams.get('calendar')).toBe('connected');
      expect(t.googleOauth.exchangeCode).toHaveBeenCalledWith('abc');
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
      t.googleOauth.exchangeCode.mockResolvedValue(grant);
      t.googleOauth.hasRequiredScopes.mockReturnValue(false);

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('missing-scope');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('goes back with calendar=error when the code exchange fails', async () => {
      const state = await stateOfAna();
      t.googleOauth.exchangeCode.mockRejectedValue(
        new ExternalServiceError('Google OAuth code exchange failed'),
      );

      const res = await callback({ code: 'abc', state }).expect(302);

      expect(location(res).searchParams.get('calendar')).toBe('error');
      expect(t.calendarConnections.save).not.toHaveBeenCalled();
    });

    it('connects nothing with a tampered state', async () => {
      const [payload, signature] = (await stateOfAna()).split('.');
      const forged = Buffer.from(
        JSON.stringify({ userId: 2, expiresAt: t.clock.now().getTime() + DAY_MS }),
      ).toString('base64url');

      for (const state of [`${forged}.${signature}`, `${payload}.x`, 'garbage']) {
        const res = await callback({ code: 'abc', state }).expect(302);
        expect(location(res).searchParams.get('calendar')).toBe('error');
      }
      expect(t.googleOauth.exchangeCode).not.toHaveBeenCalled();
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
      t.googleOauth.assertConfigured.mockImplementation(() => {
        throw new NotConfiguredError('Calendario conectado no configurado');
      });

      await callback({ code: 'abc', state: 'x' }).expect(503);
    });
  });

  describe('DELETE /users/me/calendar', () => {
    it('revokes the token in Google, deletes the connection and answers 204', async () => {
      t.calendarConnections.findRefreshTokenByUserId.mockResolvedValue('refresh-secret');

      await remove().expect(204);

      expect(t.googleOauth.revoke).toHaveBeenCalledWith('refresh-secret');
      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });

    it('deletes the connection even when Google fails to revoke the token', async () => {
      t.calendarConnections.findRefreshTokenByUserId.mockResolvedValue('refresh-secret');
      t.googleOauth.revoke.mockRejectedValue(new ExternalServiceError('down'));

      await remove().expect(204);

      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });

    it('is 404 when the Usuario has no Calendario conectado', async () => {
      const res = await remove().expect(404);

      expect(res.body.message).toBe(`User ${ANA.id} has no Calendario conectado`);
      expect(t.googleOauth.revoke).not.toHaveBeenCalled();
    });

    it('is 401 without a Sesión', async () => {
      await t.http.delete('/users/me/calendar').expect(401);
    });
  });

  describe('DELETE /users/me', () => {
    it('disconnects the Calendario conectado of the Usuario dado de baja', async () => {
      t.users.findById.mockResolvedValue(ANA);
      t.users.retire.mockResolvedValue({ cancelledBookings: [] });
      t.calendarConnections.findRefreshTokenByUserId.mockResolvedValue('refresh-secret');

      await t.http.delete('/users/me').set(bearer(CLERK_TOKEN)).expect(204);

      expect(t.googleOauth.revoke).toHaveBeenCalledWith('refresh-secret');
      expect(t.calendarConnections.deleteByUserId).toHaveBeenCalledWith(ANA.id);
    });
  });
});
