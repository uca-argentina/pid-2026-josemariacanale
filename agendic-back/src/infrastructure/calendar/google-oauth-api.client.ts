import { Injectable } from '@nestjs/common';
import {
  GoogleCalendarOauth,
  GoogleGrant,
} from '../../domain/calendar/google-calendar-oauth';
import { ExternalServiceError } from '../../domain/errors';
import { readCalendarOauthConfig } from './calendar-oauth-config';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

const FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const CALENDAR_LIST_SCOPE =
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/** Los mínimos para leer los ocupados de los calendarios de la cuenta y escribir eventos en el principal. */
const REQUESTED_SCOPES = [
  'openid',
  'email',
  FREEBUSY_SCOPE,
  CALENDAR_LIST_SCOPE,
  EVENTS_SCOPE,
];
const REQUIRED_SCOPES = [FREEBUSY_SCOPE, CALENDAR_LIST_SCOPE, EVENTS_SCOPE];

interface GoogleTokenResponse {
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** OAuth de Google con el cliente propio del back (`GOOGLE_OAUTH_*`); sin credenciales el back arranca igual (ADR 0036). */
@Injectable()
export class GoogleOauthApiClient implements GoogleCalendarOauth {
  /** @throws {NotConfiguredError} faltan las credenciales OAuth de Google */
  assertConfigured() {
    readCalendarOauthConfig();
  }

  /** @throws {NotConfiguredError} faltan las credenciales OAuth de Google */
  authorizationUrl(state: string) {
    const { clientId, redirectUri } = readCalendarOauthConfig();
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: REQUESTED_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'false',
      state,
    });
    return `${AUTHORIZATION_ENDPOINT}?${query}`;
  }

  /**
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   * @throws {ExternalServiceError} Google rechazó el código, no respondió o no mandó refresh token
   */
  async exchangeCode(code: string): Promise<GoogleGrant> {
    const { clientId, clientSecret, redirectUri } = readCalendarOauthConfig();
    let data: GoogleTokenResponse;
    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      data = (await res.json()) as GoogleTokenResponse;
    } catch (error) {
      throw new ExternalServiceError('Google OAuth not reachable', {
        cause: error,
      });
    }
    if (data.error || !data.refresh_token || !data.id_token)
      throw new ExternalServiceError(
        `Google OAuth code exchange failed: ${data.error_description ?? data.error ?? 'no refresh token'}`,
      );
    return {
      refreshToken: data.refresh_token,
      email: emailOf(data.id_token),
      scopes: (data.scope ?? '').split(' ').filter(Boolean),
    };
  }

  /** @throws {ExternalServiceError} Google rechazó la revocación o no respondió */
  async revoke(refreshToken: string) {
    let status: number;
    try {
      const res = await fetch(REVOKE_ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams({ token: refreshToken }),
      });
      status = res.status;
    } catch (error) {
      throw new ExternalServiceError('Google OAuth not reachable', {
        cause: error,
      });
    }
    if (status !== 200)
      throw new ExternalServiceError(`Google token revocation failed: ${status}`);
  }

  /** Si `scopes` incluye los tres permisos de calendario que se piden. */
  hasRequiredScopes(scopes: string[]) {
    return REQUIRED_SCOPES.every((scope) => scopes.includes(scope));
  }
}

/** El email del `id_token`, que Google acaba de entregar por TLS al canjear el código: no hace falta verificar la firma. */
function emailOf(idToken: string): string {
  const claims = JSON.parse(
    Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
  ) as { email?: string };
  if (!claims.email)
    throw new ExternalServiceError('Google id_token has no email');
  return claims.email;
}
