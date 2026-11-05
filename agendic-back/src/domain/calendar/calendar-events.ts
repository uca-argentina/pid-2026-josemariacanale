import { DomainError } from '../errors';
import { BookingEventContent } from './booking-event';
import { CalendarCredentials } from './calendar-connection';

/** Token de inyección del puerto `CalendarEvents`. */
export const CALENDAR_EVENTS = Symbol('CalendarEvents');

/**
 * Propiedad privada con la que Agendic marca los Eventos del Turno que escribe en el calendario del Usuario (ticket
 * #401). Quien lee los ocupados la usa para no contarlos como Ocupado externo (ADR 0038).
 */
export const AGENDIC_EVENT_MARKER = 'agendicBookingId';

/** Un tramo en que el Usuario está ocupado en su Calendario conectado, fuera de Agendic. */
export interface ExternalBusy {
  start: Date;
  end: Date;
}

/** El proveedor dejó de aceptar el refresh token (`invalid_grant`): el Usuario tiene que reconectar (ADR 0036). */
export class CalendarAccessRevokedError extends DomainError {}

/** El alias con el que se nombra al calendario principal de la cuenta, en cualquier proveedor; es el que cuenta en una conexión nueva. */
export const PRIMARY_CALENDAR_ID = 'primary';

/** Un calendario de la cuenta conectada. */
export interface CalendarSummary {
  id: string;
  name: string;
  primary: boolean;
}

/** Lectura y escritura de los calendarios de un proveedor, dado el refresh token (ADR 0038). Lo implementa cada proveedor. */
export interface ProviderCalendarEvents {
  /**
   * Los calendarios de la cuenta, el principal primero.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listCalendars(
    refreshToken: string,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<CalendarSummary[]>;

  /**
   * Los ocupados de `calendarIds` que se cruzan con `[from, to)`: eventos marcados como ocupados (no los transparentes ni los cancelados),
   * sin los Eventos del Turno de Agendic. Un evento de día entero ocupa ese día en la zona del calendario. Un calendario que ya no
   * existe en la cuenta se ignora.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listBusy(
    refreshToken: string,
    calendarIds: string[],
    from: Date,
    to: Date,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<ExternalBusy[]>;

  /**
   * Crea el Evento del Turno en el calendario principal, con el Cliente de invitado y sin que Google le mande nada; devuelve su id.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  createEvent(
    refreshToken: string,
    content: BookingEventContent,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<string>;

  /**
   * Reescribe el evento con el contenido nuevo; `false` si ya no existe en el calendario (el Usuario lo borró).
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  updateEvent(
    refreshToken: string,
    eventId: string,
    content: BookingEventContent,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<boolean>;

  /**
   * Borra el evento; si ya no existe no hace nada.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  deleteEvent(
    refreshToken: string,
    eventId: string,
    onRefreshTokenRotated?: (refreshToken: string) => Promise<void>,
  ): Promise<void>;
}

/** Lectura y escritura del Calendario conectado, sea cual sea su proveedor: quien lo implementa elige a quién llamar según `credentials.provider` (ADR 0038). */
export interface CalendarEvents {
  /**
   * Los calendarios de la cuenta, el principal primero.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listCalendars(credentials: CalendarCredentials): Promise<CalendarSummary[]>;

  /**
   * Los ocupados de `calendarIds` que se cruzan con `[from, to)`: eventos marcados como ocupados (no los transparentes ni los cancelados),
   * sin los Eventos del Turno de Agendic. Un evento de día entero ocupa ese día en la zona del calendario. Un calendario que ya no
   * existe en la cuenta se ignora.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  listBusy(
    credentials: CalendarCredentials,
    calendarIds: string[],
    from: Date,
    to: Date,
  ): Promise<ExternalBusy[]>;

  /**
   * Crea el Evento del Turno en el calendario principal, con el Cliente de invitado y sin que Google le mande nada; devuelve su id.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  createEvent(
    credentials: CalendarCredentials,
    content: BookingEventContent,
  ): Promise<string>;

  /**
   * Reescribe el evento con el contenido nuevo; `false` si ya no existe en el calendario (el Usuario lo borró).
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  updateEvent(
    credentials: CalendarCredentials,
    eventId: string,
    content: BookingEventContent,
  ): Promise<boolean>;

  /**
   * Borra el evento; si ya no existe no hace nada.
   *
   * @throws {CalendarAccessRevokedError} el proveedor rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth del proveedor
   * @throws {ExternalServiceError} el proveedor respondió con error o no respondió
   */
  deleteEvent(credentials: CalendarCredentials, eventId: string): Promise<void>;
}
