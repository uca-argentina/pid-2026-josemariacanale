import { Injectable } from '@nestjs/common';
import {
  ExternalServiceError,
  NotConfiguredError,
} from '../../domain/errors';
import { GoogleCalendarClient } from '../../domain/holidays/google-calendar-client';
import { findCalendarId } from '../../domain/holidays/holiday-calendars';
import { Holiday } from '../../domain/holidays/holiday';

interface GoogleEventsResponse {
  items?: {
    id: string;
    summary: string;
    start: { date?: string; dateTime?: string };
  }[];
  error?: { code: number; message: string };
}

/** Lee Google Calendar con `GOOGLE_CALENDAR_API_KEY`; sin ella el back arranca igual y falla al usarla (ADR 0027). */
@Injectable()
export class GoogleCalendarApiClient implements GoogleCalendarClient {
  /** @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY` */
  assertConfigured() {
    this.apiKey();
  }

  /**
   * @throws {NotConfiguredError} falta `GOOGLE_CALENDAR_API_KEY`
   * @throws {ExternalServiceError} Google no responde o respondió con error
   */
  async fetchHolidays(countryCode: string, year: number): Promise<Holiday[]> {
    const key = this.apiKey();
    const calendarId = findCalendarId(countryCode);
    if (!calendarId) return [];
    const query = new URLSearchParams({
      key,
      timeMin: `${year}-01-01T00:00:00Z`,
      timeMax: `${year}-12-31T23:59:59Z`,
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query}`;
    let data: GoogleEventsResponse;
    try {
      data = (await (await fetch(url)).json()) as GoogleEventsResponse;
    } catch (error) {
      throw new ExternalServiceError(
        `Google Calendar not reachable for ${countryCode} ${year}`,
        { cause: error },
      );
    }
    if (data.error) {
      throw new ExternalServiceError(
        `Google Calendar failed for ${countryCode} ${year}: ${data.error.message}`,
        { cause: data.error },
      );
    }
    return (data.items ?? []).flatMap((event) => {
      const day = event.start.date ?? event.start.dateTime?.split('T')[0];
      if (!day) return [];
      return [
        {
          countryCode,
          calendarId,
          eventId: event.id,
          name: event.summary,
          date: new Date(`${day}T00:00:00.000Z`),
          year,
        },
      ];
    });
  }

  private apiKey() {
    const key = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!key) throw new NotConfiguredError('Días festivos no configurados');
    return key;
  }
}
