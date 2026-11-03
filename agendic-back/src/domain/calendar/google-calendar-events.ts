import { DomainError } from '../errors';

/** Token de inyección del puerto `GoogleCalendarEvents`. */
export const GOOGLE_CALENDAR_EVENTS = Symbol('GoogleCalendarEvents');

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

/** Google dejó de aceptar el refresh token (`invalid_grant`): el Usuario tiene que reconectar (ADR 0036). */
export class CalendarAccessRevokedError extends DomainError {}

/** Lectura de los eventos del calendario principal del Calendario conectado (ADR 0038). */
export interface GoogleCalendarEvents {
  /**
   * Los ocupados que se cruzan con `[from, to)`: eventos marcados como ocupados (no los transparentes ni los cancelados),
   * sin los Eventos del Turno de Agendic. Un evento de día entero ocupa ese día en la zona del calendario.
   *
   * @throws {CalendarAccessRevokedError} Google rechazó el refresh token
   * @throws {NotConfiguredError} faltan las credenciales OAuth de Google
   * @throws {ExternalServiceError} Google respondió con error o no respondió
   */
  listBusy(refreshToken: string, from: Date, to: Date): Promise<ExternalBusy[]>;
}
