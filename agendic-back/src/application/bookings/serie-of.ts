import { Booking } from '../../domain/bookings/booking';
import { BusinessRuleError } from '../../domain/errors';

/**
 * The Serie a Turno belongs to, for an action on the whole Serie (#305).
 *
 * @throws {BusinessRuleError} el Turno no es de una Serie
 */
export function serieOf(booking: Pick<Booking, 'id' | 'seriesId'>): string {
  if (booking.seriesId === null)
    throw new BusinessRuleError(`Turno ${booking.id} is not part of a Serie`);
  return booking.seriesId;
}
