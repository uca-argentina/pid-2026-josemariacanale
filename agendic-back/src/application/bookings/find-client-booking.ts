import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Busca el Turno pendiente o aceptado de este email; lo comparten Cancelar y Reagendar del Cliente, cualquiera sea
 * cómo se identificó el Turno (ADR 0022, #T6 lo reusará con el Enlace del Turno). Un Turno de otro email da el mismo
 * 404 que uno inexistente, para no filtrar cuál es cuál.
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
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.BOOKED)
    throw new BusinessRuleError('Turno is not pending or booked');
  return booking;
}
