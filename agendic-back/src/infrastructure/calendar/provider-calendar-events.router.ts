import { Injectable } from '@nestjs/common';
import { BookingEventContent } from '../../domain/calendar/booking-event';
import { CalendarCredentials } from '../../domain/calendar/calendar-connection';
import {
  CalendarEvents,
  CalendarSummary,
  ExternalBusy,
  ProviderCalendarEvents,
} from '../../domain/calendar/calendar-events';
import { GoogleCalendarEventsClient } from './google-calendar-events.client';
import { MicrosoftCalendarEventsClient } from './microsoft-calendar-events.client';

/** Manda cada llamada al cliente del proveedor de las credenciales: ningún caso de uso sabe con cuál habla. */
@Injectable()
export class ProviderCalendarEventsRouter implements CalendarEvents {
  constructor(
    private readonly google: GoogleCalendarEventsClient,
    private readonly microsoft: MicrosoftCalendarEventsClient,
  ) {}

  /**
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listCalendars(credentials: CalendarCredentials): Promise<CalendarSummary[]> {
    return this.of(credentials).listCalendars(
      credentials.refreshToken,
      credentials.onRefreshTokenRotated,
    );
  }

  /**
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listBusy(
    credentials: CalendarCredentials,
    calendarIds: string[],
    from: Date,
    to: Date,
  ): Promise<ExternalBusy[]> {
    return this.of(credentials).listBusy(
      credentials.refreshToken,
      calendarIds,
      from,
      to,
      credentials.onRefreshTokenRotated,
    );
  }

  /**
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  createEvent(
    credentials: CalendarCredentials,
    content: BookingEventContent,
  ): Promise<string> {
    return this.of(credentials).createEvent(
      credentials.refreshToken,
      content,
      credentials.onRefreshTokenRotated,
    );
  }

  /**
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  updateEvent(
    credentials: CalendarCredentials,
    eventId: string,
    content: BookingEventContent,
  ): Promise<boolean> {
    return this.of(credentials).updateEvent(
      credentials.refreshToken,
      eventId,
      content,
      credentials.onRefreshTokenRotated,
    );
  }

  /**
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  deleteEvent(
    credentials: CalendarCredentials,
    eventId: string,
  ): Promise<void> {
    return this.of(credentials).deleteEvent(
      credentials.refreshToken,
      eventId,
      credentials.onRefreshTokenRotated,
    );
  }

  private of({ provider }: CalendarCredentials): ProviderCalendarEvents {
    return provider === 'MICROSOFT' ? this.microsoft : this.google;
  }
}
