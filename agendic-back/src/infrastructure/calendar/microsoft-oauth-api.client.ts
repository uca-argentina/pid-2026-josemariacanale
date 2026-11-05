import { Injectable } from '@nestjs/common';
import {
  CalendarGrant,
  ProviderCalendarOauth,
} from '../../domain/calendar/calendar-oauth';
import { ExternalServiceError } from '../../domain/errors';
import { readCalendarOauthConfig } from './calendar-oauth-config';

/** `common`: la app es multi-tenant y acepta cuentas personales y de trabajo. */
const AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const AUTHORIZATION_ENDPOINT = `${AUTHORITY}/authorize`;
export const MICROSOFT_TOKEN_ENDPOINT = `${AUTHORITY}/token`;

/** Los mínimos para leer y escribir los eventos de los calendarios de la cuenta; `offline_access` da el refresh token. */
export const MICROSOFT_REQUESTED_SCOPES = [
  'openid',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
];
const REQUIRED_SCOPES = ['calendars.readwrite'];

interface MicrosoftTokenResponse {
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth de Microsoft con el cliente propio del back (`MICROSOFT_OAUTH_*`); sin credenciales el back arranca igual
 * (ADR 0036). Microsoft no tiene un endpoint para revocar un refresh token, así que `revoke` no hace nada: el Usuario
 * puede quitarle el permiso a la app desde su cuenta.
 */
@Injectable()
export class MicrosoftOauthApiClient implements ProviderCalendarOauth {
  /** @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft */
  assertConfigured() {
    readCalendarOauthConfig('MICROSOFT');
  }

  /** @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft */
  authorizationUrl(state: string) {
    const { clientId, redirectUri } = readCalendarOauthConfig('MICROSOFT');
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: MICROSOFT_REQUESTED_SCOPES.join(' '),
      prompt: 'consent',
      state,
    });
    return `${AUTHORIZATION_ENDPOINT}?${query}`;
  }

  /**
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft rechazó el código, no respondió o no mandó refresh token
   */
  async exchangeCode(code: string): Promise<CalendarGrant> {
    const { clientId, clientSecret, redirectUri } =
      readCalendarOauthConfig('MICROSOFT');
    let data: MicrosoftTokenResponse;
    try {
      const res = await fetch(MICROSOFT_TOKEN_ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: MICROSOFT_REQUESTED_SCOPES.join(' '),
        }),
      });
      data = (await res.json()) as MicrosoftTokenResponse;
    } catch (error) {
      throw new ExternalServiceError('Microsoft OAuth not reachable', {
        cause: error,
      });
    }
    if (data.error || !data.refresh_token || !data.id_token)
      throw new ExternalServiceError(
        `Microsoft OAuth code exchange failed: ${data.error ?? 'no refresh token'}`,
      );
    return {
      refreshToken: data.refresh_token,
      email: emailOf(data.id_token),
      scopes: (data.scope ?? '').split(' ').filter(Boolean),
    };
  }

  /** Microsoft no ofrece revocar un refresh token: no hace nada. */
  async revoke() {}

  /** Si `scopes` incluye el permiso de calendario que se pide (Microsoft lo devuelve sin respetar mayúsculas). */
  hasRequiredScopes(scopes: string[]) {
    const granted = scopes.map((scope) => scope.toLowerCase());
    return REQUIRED_SCOPES.every((scope) => granted.includes(scope));
  }
}

/**
 * El email del `id_token`, que Microsoft acaba de entregar por TLS al canjear el código: no hace falta verificar la
 * firma. Una cuenta sin `email` cae a `preferred_username`, que en Microsoft es el nombre de la cuenta.
 */
function emailOf(idToken: string): string {
  const claims = JSON.parse(
    Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
  ) as { email?: string; preferred_username?: string };
  const email = claims.email ?? claims.preferred_username;
  if (!email) throw new ExternalServiceError('Microsoft id_token has no email');
  return email;
}
