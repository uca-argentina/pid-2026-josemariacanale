import { Booking, BookingStatus } from './booking';

/**
 * Por qué hoy no se puede Calificar un Turno, o null si se puede. Las razones que no son "ya tiene Calificación" van
 * en el 422 de `POST /booking-links/:secret/rating`.
 */
export const ratingBlocker = (
  booking: Pick<Booking, 'status' | 'endsAt' | 'noShowAt' | 'employeeNoShowAt'>,
  now: Date,
): string | null =>
  booking.status === BookingStatus.BOOKED &&
  booking.endsAt < now &&
  !booking.noShowAt &&
  !booking.employeeNoShowAt
    ? null
    : 'Turno cannot be rated';
