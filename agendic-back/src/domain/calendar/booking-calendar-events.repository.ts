import { EventBooking } from './booking-event';

export const BOOKING_CALENDAR_EVENTS_REPOSITORY = Symbol(
  'BookingCalendarEventsRepository',
);

/** Un Evento del Turno ya escrito en el calendario del Usuario. */
export interface StoredBookingEvent {
  bookingId: number;
  userId: number;
  googleEventId: string;
  /** Lo último que se escribió, ver `eventFingerprint`. */
  fingerprint: string;
}

/** Un Turno vivo con el evento que ya tiene, si lo tiene. */
export interface LiveBookingWithEvent extends EventBooking {
  event: StoredBookingEvent | null;
}

/** Acceso a los Eventos del Turno escritos (ADR 0038, #401). */
export interface BookingCalendarEventsRepository {
  /**
   * Los Turnos pendientes o aceptados que todavía no terminaron, de los Usuarios con Calendario conectado `CONNECTED`.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  listLiveOfConnectedUsers(now: Date): Promise<LiveBookingWithEvent[]>;

  /**
   * Los eventos cuyo Turno quedó Cancelado o Rechazado (un Reagendar deja el original Cancelado), de Usuarios `CONNECTED`.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  listOfEndedBookingsOfConnectedUsers(): Promise<StoredBookingEvent[]>;

  /**
   * El evento de la cadena de Reagendamientos anteriores al Turno (ADR 0031), o `null` si ninguno lo tiene.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  findEventOfPreviousBooking(
    bookingId: number,
  ): Promise<StoredBookingEvent | null>;

  /**
   * Guarda lo escrito para el Turno; si ya tenía un evento, lo reemplaza.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  save(event: StoredBookingEvent, now: Date): Promise<void>;

  /**
   * Pasa el evento de un Turno al Turno que lo reemplazó al Reagendar.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  moveToBooking(fromBookingId: number, toBookingId: number): Promise<void>;

  /**
   * Olvida el evento del Turno; sin evento no hace nada.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  deleteByBookingId(bookingId: number): Promise<void>;

  /**
   * Los eventos del Usuario cuyo Turno todavía no terminó.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  listFutureByUserId(userId: number, now: Date): Promise<StoredBookingEvent[]>;

  /**
   * Olvida todos los eventos del Usuario.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  deleteByUserId(userId: number): Promise<void>;
}
