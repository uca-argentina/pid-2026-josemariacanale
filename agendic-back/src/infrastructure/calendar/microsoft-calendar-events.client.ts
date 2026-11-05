import { Injectable, Logger } from '@nestjs/common';
import { BookingEventContent } from '../../domain/calendar/booking-event';
import {
  AGENDIC_EVENT_MARKER,
  CalendarAccessRevokedError,
  CalendarSummary,
  ExternalBusy,
  PRIMARY_CALENDAR_ID,
  ProviderCalendarEvents,
} from '../../domain/calendar/calendar-events';
import { ExternalServiceError } from '../../domain/errors';
import { readCalendarOauthConfig } from './calendar-oauth-config';
import {
  MICROSOFT_REQUESTED_SCOPES,
  MICROSOFT_TOKEN_ENDPOINT,
} from './microsoft-oauth-api.client';

const logger = new Logger('MicrosoftCalendarEvents');

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/** Los Eventos del Turno siempre van al calendario principal de la cuenta. */
const PRIMARY_CALENDAR_URL = `${GRAPH_API}/me/calendar`;

/**
 * La propiedad que marca los Eventos del Turno: una propiedad extendida con nombre en el espacio de nombres público
 * de Outlook (`PS_PUBLIC_STRINGS`). Equivale a la propiedad privada de Google.
 */
const MARKER_PROPERTY_ID = `String {00020329-0000-0000-C000-000000000046} Name ${AGENDIC_EVENT_MARKER}`;

/** Los `error` del endpoint de tokens con que Microsoft dice que el refresh token ya no sirve. */
const REVOKED_ERRORS = ['invalid_grant', 'interaction_required'];

interface GraphDateTime {
  dateTime: string;
}

interface GraphEvent {
  isCancelled?: boolean;
  showAs?: string;
  start?: GraphDateTime;
  end?: GraphDateTime;
  singleValueExtendedProperties?: { id: string; value: string }[];
}

interface GraphPage<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

/**
 * Lee los calendarios del Calendario conectado de Microsoft y los eventos de los que el Usuario tildó, y escribe los
 * Eventos del Turno, con Microsoft Graph (ADR 0038).
 *
 * Graph no deja crear un evento con invitados sin que Microsoft les mande la invitación, y el Cliente no tiene que
 * recibir nada: por eso el Cliente va en la descripción y no como invitado.
 */
@Injectable()
export class MicrosoftCalendarEventsClient implements ProviderCalendarEvents {
  /**
   * @throws {CalendarAccessRevokedError} Microsoft rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft respondió con error o no respondió
   */
  async listCalendars(refreshToken: string, onRefreshTokenRotated?: (refreshToken: string) => Promise<void>) {
    const accessToken = await this.refreshAccessToken(
      refreshToken,
      onRefreshTokenRotated,
    );
    const calendars: CalendarSummary[] = [];
    let url: string | undefined =
      `${GRAPH_API}/me/calendars?$select=id,name,isDefaultCalendar&$top=100`;
    while (url) {
      const res = await this.send('GET', url, accessToken);
      if (!res.ok)
        throw new ExternalServiceError(
          `Microsoft calendar list request failed: ${res.status}`,
        );
      const page = (await res.json()) as GraphPage<{
        id: string;
        name?: string;
        isDefaultCalendar?: boolean;
      }>;
      for (const item of page.value ?? [])
        calendars.push({
          id: item.id,
          name: item.name ?? item.id,
          primary: item.isDefaultCalendar === true,
        });
      url = page['@odata.nextLink'];
    }
    return calendars.sort((a, b) => Number(b.primary) - Number(a.primary));
  }

  /**
   * @throws {CalendarAccessRevokedError} Microsoft rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft respondió con error o no respondió
   */
  async listBusy(
    refreshToken: string,
    calendarIds: string[],
    from: Date,
    to: Date,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ) {
    const accessToken = await this.refreshAccessToken(
      refreshToken,
      onRefreshTokenRotated,
    );
    const busy: ExternalBusy[] = [];
    for (const calendarId of calendarIds) {
      let url: string | undefined = calendarViewUrl(calendarId, from, to);
      while (url) {
        const res = await this.send('GET', url, accessToken, undefined, {
          Prefer: 'outlook.timezone="UTC"',
        });
        // A checked calendar that left the account is ignored, not an error.
        if (res.status === 404) break;
        if (!res.ok)
          throw new ExternalServiceError(
            `Microsoft Calendar events request failed: ${res.status}`,
          );
        const page = (await res.json()) as GraphPage<GraphEvent>;
        for (const event of page.value ?? []) {
          const range = busyRange(event);
          if (range) busy.push(range);
        }
        url = page['@odata.nextLink'];
      }
    }
    return busy;
  }

  /**
   * @throws {CalendarAccessRevokedError} Microsoft rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft respondió con error o no respondió
   */
  async createEvent(
    refreshToken: string,
    content: BookingEventContent,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ) {
    const accessToken = await this.refreshAccessToken(
      refreshToken,
      onRefreshTokenRotated,
    );
    const res = await this.send(
      'POST',
      `${PRIMARY_CALENDAR_URL}/events`,
      accessToken,
      {
        ...eventBody(content),
        singleValueExtendedProperties: [
          { id: MARKER_PROPERTY_ID, value: String(content.bookingId) },
        ],
      },
    );
    if (!res.ok)
      throw new ExternalServiceError(
        `Microsoft event creation failed: ${res.status}`,
      );
    const { id } = (await res.json()) as { id: string };
    return id;
  }

  /**
   * @throws {CalendarAccessRevokedError} Microsoft rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft respondió con error o no respondió
   */
  async updateEvent(
    refreshToken: string,
    eventId: string,
    content: BookingEventContent,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ) {
    const accessToken = await this.refreshAccessToken(
      refreshToken,
      onRefreshTokenRotated,
    );
    const res = await this.send(
      'PATCH',
      `${GRAPH_API}/me/events/${encodeURIComponent(eventId)}`,
      accessToken,
      eventBody(content),
    );
    if (res.status === 404) return false;
    if (!res.ok)
      throw new ExternalServiceError(
        `Microsoft event update failed: ${res.status}`,
      );
    return true;
  }

  /**
   * @throws {CalendarAccessRevokedError} Microsoft rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Microsoft
   * @throws {ExternalServiceError} Microsoft respondió con error o no respondió
   */
  async deleteEvent(
    refreshToken: string,
    eventId: string,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ) {
    const accessToken = await this.refreshAccessToken(
      refreshToken,
      onRefreshTokenRotated,
    );
    const res = await this.send(
      'DELETE',
      `${GRAPH_API}/me/events/${encodeURIComponent(eventId)}`,
      accessToken,
    );
    if (res.ok || res.status === 404) return;
    throw new ExternalServiceError(
      `Microsoft event deletion failed: ${res.status}`,
    );
  }

  private async send(
    method: string,
    url: string,
    accessToken: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    try {
      return await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new ExternalServiceError('Microsoft Calendar not reachable', {
        cause: error,
      });
    }
  }

  /**
   * Microsoft puede devolver un refresh token nuevo al renovar el acceso; el anterior deja de ser el vigente, así que
   * se guarda. Si guardarlo falla se loguea y el acceso renovado se usa igual: el token viejo sigue sirviendo.
   */
  private async refreshAccessToken(
    refreshToken: string,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<string> {
    const { clientId, clientSecret } = readCalendarOauthConfig('MICROSOFT');
    let res: Response;
    try {
      res = await fetch(MICROSOFT_TOKEN_ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: MICROSOFT_REQUESTED_SCOPES.join(' '),
        }),
      });
    } catch (error) {
      throw new ExternalServiceError('Microsoft OAuth not reachable', {
        cause: error,
      });
    }
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
    };
    if (data.error && REVOKED_ERRORS.includes(data.error))
      throw new CalendarAccessRevokedError(
        'Microsoft rejected the refresh token',
      );
    if (!res.ok || !data.access_token)
      throw new ExternalServiceError(
        `Microsoft token refresh failed: ${data.error ?? res.status}`,
      );
    if (
      data.refresh_token &&
      data.refresh_token !== refreshToken &&
      onRefreshTokenRotated
    )
      await onRefreshTokenRotated(data.refresh_token).catch((error) =>
        logger.error(
          'Microsoft refresh token rotated but not saved; the previous one keeps working',
          error instanceof Error ? error.stack : String(error),
        ),
      );
    return data.access_token;
  }
}

/**
 * La dirección de los eventos del rango, con las repeticiones ya expandidas. Los `$` van tal cual: son parte del
 * nombre de las opciones de OData.
 */
function calendarViewUrl(calendarId: string, from: Date, to: Date): string {
  const calendar =
    calendarId === PRIMARY_CALENDAR_ID
      ? PRIMARY_CALENDAR_URL
      : `${GRAPH_API}/me/calendars/${encodeURIComponent(calendarId)}`;
  const expand = `singleValueExtendedProperties($filter=id eq '${MARKER_PROPERTY_ID}')`;
  return (
    `${calendar}/calendarView` +
    `?startDateTime=${encodeURIComponent(from.toISOString())}` +
    `&endDateTime=${encodeURIComponent(to.toISOString())}` +
    `&$select=start,end,showAs,isCancelled` +
    `&$expand=${encodeURIComponent(expand)}` +
    `&$top=1000`
  );
}

/** El cuerpo del evento, en UTC. El Cliente va en la descripción y no como invitado (ver la clase). */
function eventBody(content: BookingEventContent) {
  return {
    subject: content.title,
    body: {
      contentType: 'text',
      content: `Cliente: ${content.attendeeEmail}\n${content.description}`,
    },
    // An empty name clears the location of an update.
    location: { displayName: content.location ?? '' },
    start: { dateTime: content.start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: content.end.toISOString(), timeZone: 'UTC' },
  };
}

/** El tramo que un evento ocupa, o `null` si no cuenta: cancelado, "disponible" o un Evento del Turno de Agendic. */
function busyRange(event: GraphEvent): ExternalBusy | null {
  if (event.isCancelled === true || event.showAs === 'free') return null;
  if (
    event.singleValueExtendedProperties?.some(
      (property) => property.id === MARKER_PROPERTY_ID,
    )
  )
    return null;
  if (!event.start || !event.end) return null;
  // `Prefer: outlook.timezone="UTC"` makes all-day events instants too, so they need no special case.
  return { start: utcDate(event.start), end: utcDate(event.end) };
}

/** Graph manda la hora en UTC sin `Z` y con siete decimales (`2026-01-02T13:00:00.0000000`). */
function utcDate({ dateTime }: GraphDateTime): Date {
  return new Date(`${dateTime.replace(/(\.\d{3})\d*$/, '$1')}Z`);
}
