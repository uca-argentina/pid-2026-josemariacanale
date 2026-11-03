import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  AGENDIC_EVENT_MARKER,
  CalendarAccessRevokedError,
  ExternalBusy,
  GoogleCalendarEvents,
  GoogleCalendarSummary,
} from '../../domain/calendar/google-calendar-events';
import { ExternalServiceError } from '../../domain/errors';
import { readCalendarOauthConfig } from './calendar-oauth-config';

dayjs.extend(utc);
dayjs.extend(timezone);

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleEvent {
  status?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

interface GoogleCalendarListPage {
  items?: {
    id: string;
    summary?: string;
    summaryOverride?: string;
    primary?: boolean;
  }[];
  nextPageToken?: string;
}

interface GoogleEventsPage {
  items?: GoogleEvent[];
  nextPageToken?: string;
  timeZone?: string;
}

/**
 * Lee los calendarios del Calendario conectado y los eventos de los que el Usuario tildó (ADR 0038). No usa la API de solo ocupado/libre
 * porque no deja distinguir los Eventos del Turno que escribe Agendic.
 */
@Injectable()
export class GoogleCalendarEventsClient implements GoogleCalendarEvents {
  /**
   * @throws {CalendarAccessRevokedError} Google rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   * @throws {ExternalServiceError} Google respondió con error o no respondió
   */
  async listCalendars(refreshToken: string) {
    const accessToken = await this.refreshAccessToken(refreshToken);
    const calendars: GoogleCalendarSummary[] = [];
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({
        minAccessRole: 'reader',
        fields: 'nextPageToken,items(id,summary,summaryOverride,primary)',
      });
      if (pageToken) query.set('pageToken', pageToken);
      const res = await this.get(
        `${CALENDAR_API}/users/me/calendarList?${query}`,
        accessToken,
      );
      if (!res.ok)
        throw new ExternalServiceError(
          `Google calendar list request failed: ${res.status}`,
        );
      const page = (await res.json()) as GoogleCalendarListPage;
      for (const item of page.items ?? [])
        calendars.push({
          id: item.id,
          name: item.summaryOverride ?? item.summary ?? item.id,
          primary: item.primary === true,
        });
      pageToken = page.nextPageToken;
    } while (pageToken);
    return calendars.sort((a, b) => Number(b.primary) - Number(a.primary));
  }

  /**
   * @throws {CalendarAccessRevokedError} Google rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   * @throws {ExternalServiceError} Google respondió con error o no respondió
   */
  async listBusy(
    refreshToken: string,
    calendarIds: string[],
    from: Date,
    to: Date,
  ) {
    const accessToken = await this.refreshAccessToken(refreshToken);
    const busy: ExternalBusy[] = [];
    for (const calendarId of calendarIds) {
      let pageToken: string | undefined;
      do {
        const page = await this.fetchPage(
          accessToken,
          calendarId,
          from,
          to,
          pageToken,
        );
        // A checked calendar that left the account is ignored, not an error.
        if (!page) break;
        for (const event of page.items ?? []) {
          const range = busyRange(event, page.timeZone ?? 'UTC');
          if (range) busy.push(range);
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return busy;
  }

  private async get(url: string, accessToken: string): Promise<Response> {
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      throw new ExternalServiceError('Google Calendar not reachable', {
        cause: error,
      });
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const { clientId, clientSecret } = readCalendarOauthConfig();
    let res: Response;
    try {
      res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
    } catch (error) {
      throw new ExternalServiceError('Google OAuth not reachable', {
        cause: error,
      });
    }
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
    };
    if (data.error === 'invalid_grant')
      throw new CalendarAccessRevokedError('Google rejected the refresh token');
    if (!res.ok || !data.access_token)
      throw new ExternalServiceError(
        `Google token refresh failed: ${data.error ?? res.status}`,
      );
    return data.access_token;
  }

  private async fetchPage(
    accessToken: string,
    calendarId: string,
    from: Date,
    to: Date,
    pageToken?: string,
  ): Promise<GoogleEventsPage | null> {
    const query = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      maxResults: '2500',
      fields:
        'timeZone,nextPageToken,items(status,transparency,start,end,extendedProperties/private)',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const res = await this.get(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${query}`,
      accessToken,
    );
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok)
      throw new ExternalServiceError(
        `Google Calendar events request failed: ${res.status}`,
      );
    return (await res.json()) as GoogleEventsPage;
  }
}

/** El tramo que un evento ocupa, o `null` si no cuenta: cancelado, "disponible" o un Evento del Turno de Agendic. */
function busyRange(
  event: GoogleEvent,
  calendarZone: string,
): ExternalBusy | null {
  if (event.status === 'cancelled' || event.transparency === 'transparent')
    return null;
  if (event.extendedProperties?.private?.[AGENDIC_EVENT_MARKER]) return null;
  const { start, end } = event;
  if (start?.dateTime && end?.dateTime)
    return { start: new Date(start.dateTime), end: new Date(end.dateTime) };
  // A day-long event has dates, not instants: it spans those days in the calendar's own zone; `end.date` is exclusive.
  if (start?.date && end?.date)
    return {
      start: dayjs.tz(start.date, calendarZone).toDate(),
      end: dayjs.tz(end.date, calendarZone).toDate(),
    };
  return null;
}
