import { createHmac } from 'node:crypto';
import { NotConfiguredError } from '../../domain/errors';

/** Lo que el entorno tiene que dar para el OAuth propio de Google Calendar (ADR 0036). */
export interface CalendarOauthConfig {
  clientId: string;
  clientSecret: string;
  /** La dirección del callback del back, la misma que se registra en Google. */
  redirectUri: string;
  /** La pantalla del front a la que vuelve el callback. */
  returnUrl: string;
  /** AES-256-GCM del refresh token. */
  tokenKey: Buffer;
  /** Firma del `state`; sale de `tokenKey` para no pedir otro secreto. */
  stateKey: Buffer;
}

/**
 * Lee la configuración del entorno cada vez que se usa, para que un entorno sin credenciales arranque igual
 * (como los Días festivos, ADR 0028).
 *
 * @throws {NotConfiguredError} falta alguna variable, o `CALENDAR_TOKEN_KEY` no son 32 bytes en base64
 */
export function readCalendarOauthConfig(): CalendarOauthConfig {
  const env = process.env;
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI;
  const returnUrl = env.CALENDAR_RETURN_URL;
  const rawKey = env.CALENDAR_TOKEN_KEY;
  if (!clientId || !clientSecret || !redirectUri || !returnUrl || !rawKey)
    throw new NotConfiguredError('Calendario conectado no configurado');
  const tokenKey = Buffer.from(rawKey, 'base64');
  if (tokenKey.length !== 32)
    throw new NotConfiguredError('CALENDAR_TOKEN_KEY must be 32 bytes in base64');
  const stateKey = createHmac('sha256', tokenKey)
    .update('calendar-oauth-state')
    .digest();
  return { clientId, clientSecret, redirectUri, returnUrl, tokenKey, stateKey };
}
