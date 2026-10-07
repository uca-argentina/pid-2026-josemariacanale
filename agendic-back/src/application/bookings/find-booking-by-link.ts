import { BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError } from '../../domain/errors';

/**
 * Busca el Turno pendiente o aceptado por su Enlace del Turno; lo comparten Cancelar y Reagendar por el Enlace,
 * con la misma lógica que `findClientBooking` usa por email (ADR 0022).
 *
 * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
 * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado
 */
export async function findBookingByLink(
  bookings: BookingsRepository,
  link: string,
): Promise<ClientBooking> {
  const booking = await bookings.findByLink(link);
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.BOOKED)
    throw new BusinessRuleError('Turno is not pending or booked');
  return booking;
}
