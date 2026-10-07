import { ClientBooking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { assertOpenBooking } from './assert-open-booking';

/**
 * Busca el Turno pendiente o aceptado por su Enlace del Turno; lo comparten Cancelar y Reagendar por el Enlace
 * (ADR 0022).
 *
 * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
 * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado
 */
export async function findBookingByLink(
  bookings: BookingsRepository,
  link: string,
): Promise<ClientBooking> {
  const booking = await bookings.findByLink(link);
  assertOpenBooking(booking);
  return booking;
}
