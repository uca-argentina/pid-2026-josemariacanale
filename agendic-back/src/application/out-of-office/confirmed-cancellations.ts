import { CausedCancellationOrder } from '../../domain/bookings/booking';
import { ConflictError } from '../../domain/errors';
import { LeftOutsideBooking } from '../bookings/left-outside-bookings.service';

/**
 * Exige que el Usuario haya confirmado todos los Turnos que el cambio deja afuera (ADR 0034) y los devuelve como las
 * órdenes de cancelación que escribe el repositorio. Los ids confirmados que ya no quedan afuera se ignoran.
 *
 * @throws {ConflictError} queda afuera algún Turno que `cancelBookingIds` no incluye
 */
export function confirmedCancellations(
  left: LeftOutsideBooking[],
  cancelBookingIds: number[],
): CausedCancellationOrder[] {
  const confirmed = new Set(cancelBookingIds);
  if (left.some(({ id }) => !confirmed.has(id)))
    throw new ConflictError(
      'Los Turnos que quedan fuera de tu horario cambiaron',
    );
  return left.map(({ id, cancellationCause, cancellationReason }) => ({
    id,
    cause: cancellationCause,
    reason: cancellationReason,
  }));
}
