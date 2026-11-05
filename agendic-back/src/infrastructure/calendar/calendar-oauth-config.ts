import { createHmac } from 'node:crypto';
import { CalendarProvider } from '../../domain/calendar/calendar-connection';
import { NotConfiguredError } from '../../domain/errors';

/** Lo que el entorno tiene que dar para el Calendario conectado, sea cual sea el proveedor (ADR 0036). */
export interface SharedCalendarConfig {
  /** La pantalla del front a la que vuelve el callback. */
  returnUrl: string;
  /** AES-256-GCM del refresh token. */
  tokenKey: Buffer;
  /** Firma del `state`; sale de `tokenKey` para no pedir otro secreto. */
  stateKey: Buffer;
}

/** Lo que el entorno tiene que dar para el OAuth propio de un proveedor. */
export interface CalendarOauthConfig extends SharedCalendarConfig {
  clientId: string;
  clientSecret: string;
  /** La dirección del callback del back, la misma que se registra en el proveedor. */
  redirectUri: string;
}

/** Las variables de entorno con las credenciales de cada proveedor. */
const PROVIDER_ENV: Record<
  CalendarProvider,
  { clientId: string; clientSecret: string; redirectUri: string }
> = {
  GOOGLE: {
    clientId: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecret: 'GOOGLE_OAUTH_CLIENT_SECRET',
    redirectUri: 'GOOGLE_OAUTH_REDIRECT_URI',
  },
  MICROSOFT: {
    clientId: 'MICROSOFT_OAUTH_CLIENT_ID',
    clientSecret: 'MICROSOFT_OAUTH_CLIENT_SECRET',
    redirectUri: 'MICROSOFT_OAUTH_REDIRECT_URI',
  },
};

/**
 * Lee la parte de la configuración que no depende del proveedor: a dónde vuelve el callback y las claves. La usan
 * quienes no hablan con ningún proveedor (el repositorio, el `state`, el redirect).
 *
 * @throws {NotConfiguredError} falta `CALENDAR_RETURN_URL` o `CALENDAR_TOKEN_KEY`, o no son 32 bytes en base64
 */
export function readSharedCalendarConfig(): SharedCalendarConfig {
  const returnUrl = process.env.CALENDAR_RETURN_URL;
  const rawKey = process.env.CALENDAR_TOKEN_KEY;
  if (!returnUrl || !rawKey)
    throw new NotConfiguredError('Calendario conectado no configurado');
  const tokenKey = Buffer.from(rawKey, 'base64');
  if (tokenKey.length !== 32)
    throw new NotConfiguredError(
      'CALENDAR_TOKEN_KEY must be 32 bytes in base64',
    );
  const stateKey = createHmac('sha256', tokenKey)
    .update('calendar-oauth-state')
    .digest();
  return { returnUrl, tokenKey, stateKey };
}

/**
 * Lee la configuración del entorno cada vez que se usa, para que un entorno sin credenciales arranque igual
 * (como los Días festivos, ADR 0028).
 *
 * @throws {NotConfiguredError} falta alguna variable del proveedor o de {@link readSharedCalendarConfig}
 */
export function readCalendarOauthConfig(
  provider: CalendarProvider = 'GOOGLE',
): CalendarOauthConfig {
  const names = PROVIDER_ENV[provider];
  const clientId = process.env[names.clientId];
  const clientSecret = process.env[names.clientSecret];
  const redirectUri = process.env[names.redirectUri];
  if (!clientId || !clientSecret || !redirectUri)
    // The same message for every provider: it is API contract (ADR 0007).
    throw new NotConfiguredError('Calendario conectado no configurado');
  return { ...readSharedCalendarConfig(), clientId, clientSecret, redirectUri };
}
