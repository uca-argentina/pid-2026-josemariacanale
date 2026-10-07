import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BusinessRuleError } from '../../domain/errors';

/**
 * El Turno que Cancelar y Reagendar del Cliente, o por Enlace del Turno, pueden tocar: pendiente o aceptado
 * (ADR 0022).
 *
 * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado
 */
export function assertOpenBooking(booking: Pick<Booking, 'status'>): void {
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.BOOKED)
    throw new BusinessRuleError('Turno is not pending or booked');
}
