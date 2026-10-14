import { Booking, BookingActor, BookingRating } from './booking';

/** Un Turno de la cadena de Reagendamientos con lo que el Historial del Turno necesita además de sus campos. */
export interface HistoryBooking extends Booking {
  createdAt: Date;
  rating: BookingRating | null;
}

/** Una línea del Historial del Turno (ADR 0033), deducida de los campos del Turno. */
export interface BookingHistoryEntry {
  type:
    | 'booked'
    | 'accepted'
    | 'rejected'
    | 'cancelled'
    | 'rescheduled'
    | 'noShow'
    | 'employeeNoShow'
    | 'depositPaid'
    | 'rated';
  at: Date;
  actor: 'employee' | 'client' | 'retirement' | null;
  reason: string | null;
  /** Solo `rescheduled`: el horario de antes. */
  from: { startsAt: Date; endsAt: Date } | null;
}

const ACTORS = {
  [BookingActor.EMPLOYEE]: 'employee',
  [BookingActor.CLIENT]: 'client',
  [BookingActor.RETIREMENT]: 'retirement',
} as const;

/**
 * Arma el Historial del Turno en orden cronológico a partir de la cadena de Reagendamientos, del original al Turno
 * actual (el último).
 */
export const buildBookingHistory = (chain: HistoryBooking[]): BookingHistoryEntry[] => {
  const entries: BookingHistoryEntry[] = [];
  const push = (
    type: BookingHistoryEntry['type'],
    at: Date,
    actor: BookingHistoryEntry['actor'],
    extra: Partial<Pick<BookingHistoryEntry, 'reason' | 'from'>> = {},
  ) => entries.push({ type, at, actor, reason: null, from: null, ...extra });

  chain.forEach((booking, index) => {
    const isCurrent = index === chain.length - 1;
    const actor = booking.cancelledBy ? ACTORS[booking.cancelledBy] : null;

    push('booked', booking.createdAt, 'client');
    // A Turno that accepted itself is born with acceptedAt equal to createdAt: nobody accepted it.
    if (booking.acceptedAt && booking.acceptedAt.getTime() !== booking.createdAt.getTime())
      push('accepted', booking.acceptedAt, 'employee');
    if (booking.depositPaidAt) push('depositPaid', booking.depositPaidAt, 'client');
    if (booking.noShowAt) push('noShow', booking.noShowAt, 'employee');
    if (booking.employeeNoShowAt) push('employeeNoShow', booking.employeeNoShowAt, 'client');
    if (booking.rating) push('rated', booking.rating.createdAt, 'client');
    if (booking.rejectedAt)
      push('rejected', booking.rejectedAt, actor, { reason: booking.cancellationReason });
    if (booking.cancelledAt) {
      if (isCurrent)
        push('cancelled', booking.cancelledAt, actor, { reason: booking.cancellationReason });
      else
        push('rescheduled', booking.cancelledAt, actor, {
          from: { startsAt: booking.startsAt, endsAt: booking.endsAt },
        });
    }
  });

  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
};
