import { NotConfiguredError } from '../../domain/errors';
import { ExternalServiceError } from '../../domain/errors';
import { MicrosoftOauthApiClient } from './microsoft-oauth-api.client';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const idToken = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

describe('MicrosoftOauthApiClient', () => {
  const client = new MicrosoftOauthApiClient();
  const env = { ...process.env };
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.MICROSOFT_OAUTH_CLIENT_ID = 'ms-id';
    process.env.MICROSOFT_OAUTH_CLIENT_SECRET = 'ms-secret';
    process.env.MICROSOFT_OAUTH_REDIRECT_URI =
      'https://api.agendic.test/calendar-oauth/microsoft/callback';
    process.env.CALENDAR_RETURN_URL = 'http://localhost/back';
    process.env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 1).toString('base64');
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    fetchMock.mockRestore();
    process.env = { ...env };
  });

  it('is not configured without the Microsoft credentials, even with the Google ones', () => {
    delete process.env.MICROSOFT_OAUTH_CLIENT_ID;
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'g';

    expect(() => client.assertConfigured()).toThrow(NotConfiguredError);
  });

  it('sends the User to the multi-tenant endpoint, asking for the calendar and the refresh token', () => {
    const url = new URL(client.authorizationUrl('signed-state'));

    expect(url.origin + url.pathname).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('ms-id');
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toBe(
      'openid email offline_access Calendars.ReadWrite',
    );
  });

  it('exchanges the code and reads the account from the id_token', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        refresh_token: 'ms-refresh',
        id_token: idToken({ email: 'ana@outlook.com' }),
        scope: 'openid email Calendars.ReadWrite',
      }),
    );

    await expect(client.exchangeCode('abc')).resolves.toEqual({
      refreshToken: 'ms-refresh',
      email: 'ana@outlook.com',
      scopes: ['openid', 'email', 'Calendars.ReadWrite'],
    });
  });

  it('falls back to preferred_username for an account without email', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        refresh_token: 'ms-refresh',
        id_token: idToken({ preferred_username: 'ana@empresa.com' }),
      }),
    );

    await expect(client.exchangeCode('abc')).resolves.toMatchObject({
      email: 'ana@empresa.com',
    });
  });

  it('fails with ExternalServiceError when Microsoft rejects the code', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400));

    await expect(client.exchangeCode('abc')).rejects.toThrow(
      ExternalServiceError,
    );
  });

  it('asks for the calendar permission, whatever the case Microsoft answers with', () => {
    expect(client.hasRequiredScopes(['openid', 'Calendars.ReadWrite'])).toBe(true);
    expect(client.hasRequiredScopes(['calendars.readwrite'])).toBe(true);
    expect(client.hasRequiredScopes(['openid', 'email'])).toBe(false);
  });

  it('revokes nothing: Microsoft has no endpoint for it', async () => {
    await expect(client.revoke()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
