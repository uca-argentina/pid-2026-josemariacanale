import { Booking, ClientBooking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';

/**
 * Cancela un Turno ya identificado y validado como pendiente o aceptado, cualquiera sea cómo se identificó (por
 * email en Mis turnos, o por Enlace del Turno, ADR 0022).
 *
 * @throws {BusinessRuleError} el Turno ya empezó
 */
export async function cancelResolvedBooking(
  bookings: BookingsRepository,
  clock: Clock,
  booking: Pick<Booking, 'id' | 'startsAt'>,
): Promise<ClientBooking> {
  if (booking.startsAt <= clock.now())
    throw new BusinessRuleError(`Turno ${booking.id} already started`);
  return bookings.cancelPendingOrBooked(booking.id);
}
