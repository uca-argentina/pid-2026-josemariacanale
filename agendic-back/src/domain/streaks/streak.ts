import { BookingStatus } from '../bookings/booking';

const DAY_MS = 86_400_000;

/** What the calculation of a Racha reads of a Turno. */
export interface StreakBooking {
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  noShowAt: Date | null;
  employeeNoShowAt: Date | null;
}

/** The Racha in course of a Ficha del Cliente, with its last Turno atendido. */
export interface Streak<T> {
  count: number;
  /** `startsAt` of its first Turno: it tells one Racha from the next. */
  startedAt: Date;
  /** Past this moment without another Turno atendido, it burns. */
  burnsAt: Date;
  last: T;
}

/** Turno atendido: the same rule as the `attended` KPI of the analíticas (ADR 0007). */
const isAttended = (booking: StreakBooking, now: Date) =>
  booking.status === BookingStatus.BOOKED &&
  booking.endsAt < now &&
  booking.noShowAt === null &&
  booking.employeeNoShowAt === null;

/**
 * The Racha in course of a Ficha, null if it has none: it is calculated on read, so Canceling, unmarking an Ausencia or
 * changing the Tiempo de quemada need nothing to undo. Each Turno atendido starting within `burnAfterDays` of the
 * previous one continues it, an Ausencia del Invitado cuts it, and every other Turno neither adds nor burns.
 *
 * @param bookings the Turnos of the Ficha, without rescheduled originals, ascending by `startsAt`
 */
export function currentStreak<T extends StreakBooking>(
  bookings: readonly T[],
  burnAfterDays: number,
  now: Date,
): Streak<T> | null {
  const burnMs = burnAfterDays * DAY_MS;
  let count = 0;
  let startedAt: Date | null = null;
  let last: T | null = null;
  for (const booking of bookings) {
    if (booking.noShowAt !== null) count = 0;
    if (!isAttended(booking, now)) continue;
    const continues =
      count > 0 &&
      last !== null &&
      booking.startsAt.getTime() - last.startsAt.getTime() <= burnMs;
    if (!continues) {
      count = 0;
      startedAt = booking.startsAt;
    }
    count += 1;
    last = booking;
  }
  if (count === 0 || startedAt === null || last === null) return null;
  const burnsAt = new Date(last.startsAt.getTime() + burnMs);
  return now <= burnsAt ? { count, startedAt, burnsAt, last } : null;
}

/**
 * The amounts of Turnos of a Racha of `count` that earn a Recompensa: `[N]` in one given once per Racha, or `N, 2N, …`
 * in a repeatable one.
 */
export function earnedCounts(
  { requiredCount, repeatable }: { requiredCount: number; repeatable: boolean },
  count: number,
): number[] {
  if (count < requiredCount) return [];
  if (!repeatable) return [requiredCount];
  return Array.from(
    { length: Math.floor(count / requiredCount) },
    (_, i) => requiredCount * (i + 1),
  );
}
