import { Booking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { NotFoundError } from '../../domain/errors';
import { assertOpenBooking } from './assert-open-booking';

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Busca el Turno pendiente o aceptado de este email; lo comparten Cancelar y Reagendar del Cliente. Un Turno de
 * otro email da el mismo 404 que uno inexistente, para no filtrar cuál es cuál (ADR 0022).
 *
 * @throws {NotFoundError} el Turno no existe o no es de este email
 * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado
 */
export async function findClientBooking(
  bookings: BookingsRepository,
  email: string,
  bookingId: number,
): Promise<Booking> {
  const booking = await bookings.findById(bookingId).catch((error: unknown) => {
    throw error instanceof NotFoundError
      ? new NotFoundError(`Turno ${bookingId} not found`)
      : error;
  });
  if (normalize(booking.clientEmail) !== normalize(email))
    throw new NotFoundError(`Turno ${bookingId} not found`);
  assertOpenBooking(booking);
  return booking;
}
