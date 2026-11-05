import { BookingStatus } from '../bookings/booking';

/** Token de inyección de `BookingPanelLinks`. */
export const BOOKING_PANEL_LINKS = Symbol('BookingPanelLinks');

/** Las direcciones del panel que el Evento del Turno enlaza. */
export interface BookingPanelLinks {
  /**
   * La dirección del Turno en Mis turnos.
   *
   * @throws {NotConfiguredError} falta la dirección del front
   */
  bookingUrl(bookingId: number): string;
}

/** Lo que el reconciliador necesita de un Turno para escribir su Evento del Turno. */
export interface EventBooking {
  id: number;
  /** Quien lo atiende: el dueño del calendario donde va el evento. */
  userId: number;
  status: BookingStatus.PENDING | BookingStatus.BOOKED;
  startsAt: Date;
  endsAt: Date;
  /** Comentario del Turno. Nunca la Nota interna ni las Preferencias del Cliente (#401). */
  notes: string | null;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  businessName: string | null;
  branchName: string | null;
  branchAddress: string | null;
  /** El Turno original que este reemplazó al Reagendar (ADR 0031). */
  fromRescheduleId: number | null;
}

/** El Evento del Turno como se escribe en Google. */
export interface BookingEventContent {
  /** El Turno al que sigue: va como marca privada para que los Ocupados externos lo descarten. */
  bookingId: number;
  title: string;
  description: string;
  location: string | null;
  start: Date;
  end: Date;
  /** El Cliente figura como invitado, sin que Google le mande nada. */
  attendeeEmail: string;
}

/**
 * Arma el Evento del Turno: título `<Servicio> · <Cliente>` (con "(pendiente)" mientras espera Aprobación manual),
 * descripción con el Comentario del Turno, dónde es y el enlace al Turno, la dirección de la Sucursal y el horario
 * del Turno sin el Tiempo de preparación.
 */
export function bookingEventContent(
  booking: EventBooking,
  bookingUrl: string,
): BookingEventContent {
  const pending = booking.status === BookingStatus.PENDING ? ' (pendiente)' : '';
  const where =
    booking.businessName && booking.branchName
      ? `${booking.businessName} · ${booking.branchName}`
      : 'Servicio personal';
  const lines = [
    booking.notes ? `Comentario: ${booking.notes}` : null,
    where,
    `Turno en Agendic: ${bookingUrl}`,
  ].filter((line) => line !== null);
  return {
    bookingId: booking.id,
    title: `${booking.serviceName} · ${booking.clientName}${pending}`,
    description: lines.join('\n'),
    location: booking.branchAddress,
    start: booking.startsAt,
    end: booking.endsAt,
    attendeeEmail: booking.clientEmail,
  };
}

/** Lo que se escribió la última vez: si no cambia, el job no toca Google. */
export function eventFingerprint(content: BookingEventContent): string {
  return JSON.stringify(content);
}
