import { AvailabilityInterval } from '../availabilities/availability';
import { AvailabilityOverride } from '../availability-overrides/availability-override';
import { Branch } from '../branches/branch';

/** Horario reservable: why a day has none, when it doesn't. */
export type SlotsReason = 'NOT_WORKING' | 'FULLY_BOOKED' | 'COVERED';

export interface DaySlots {
  date: string; // YYYY-MM-DD
  /** ISO instants, one per Horario reservable. Empty when reason is set. */
  slots: string[];
  reason?: SlotsReason;
  /** Only alongside reason COVERED. */
  coveredByEmployeeId?: number;
}

const GRID_MINUTES = 15;

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const weekdayOf = (date: string): number =>
  new Date(`${date}T00:00:00.000Z`).getUTCDay();

/** Formats an instant as the local calendar date (YYYY-MM-DD) it falls on in timeZone. Native Intl, no library. */
export const localDate = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant);

const zonedParts = new Map<string, Intl.DateTimeFormat>();
const partsFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = zonedParts.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    zonedParts.set(timeZone, formatter);
  }
  return formatter;
};

/** The wall-clock instant would show in timeZone, as milliseconds since epoch of that same wall clock read as UTC. */
const wallClockMsInZone = (instant: Date, timeZone: string): number => {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  );
};

/**
 * A local date + HH:mm in timeZone, as the UTC instant it denotes. Fixed-point over Intl.DateTimeFormat
 * (the standard zonedTimeToUtc algorithm): two passes always converge, DST transition or not.
 */
export const zonedTimeToUtc = (
  date: string,
  time: string,
  timeZone: string,
): Date => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi);
  let instant = target;
  for (let i = 0; i < 2; i++)
    instant += target - wallClockMsInZone(new Date(instant), timeZone);
  return new Date(instant);
};

/** The local date `instant` falls on in timeZone, as the half-open UTC range [from, to) it spans. */
export const localDayBounds = (
  instant: Date,
  timeZone: string,
): { date: string; from: Date; to: Date } => {
  const date = localDate(instant, timeZone);
  return {
    date,
    from: zonedTimeToUtc(date, '00:00', timeZone),
    to: zonedTimeToUtc(addDays(date, 1), '00:00', timeZone),
  };
};

/** Intersects a Franja with the Sucursal's opening hours; null if nothing survives. */
const clip = (
  interval: { startTime: string; endTime: string },
  opensAt: string,
  closesAt: string,
): { startTime: string; endTime: string } | null => {
  const startTime = interval.startTime > opensAt ? interval.startTime : opensAt;
  const endTime = interval.endTime < closesAt ? interval.endTime : closesAt;
  return startTime < endTime ? { startTime, endTime } : null;
};

export interface ComputeSlotsInput {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  branch: Pick<Branch, 'opensAt' | 'closesAt' | 'timeZone'>;
  availabilityIntervals: AvailabilityInterval[];
  /** This Empleado's Anulaciones, already narrowed to [from, to]. */
  overridesByDate: Map<string, AvailabilityOverride>;
  /** PENDING and BOOKED Turnos of this Empleado, in any of their Servicios, each from its own preparation on. */
  bookedRanges: { prepStartsAt: Date; endsAt: Date }[];
  durationMinutes: number;
  /** Tiempo de preparación of the Servicio asked for: held before each Horario reservable, inside the Franja. */
  prepMinutes: number;
  /** Local dates on which the Servicio already reached its Límite diario. */
  fullDates: Set<string>;
  now: Date;
}

/**
 * Availability Franjas → replaced by that date's Anulación, if any → clipped to the Sucursal's hours →
 * grillado de a 15' from the end of the preparation → Turnos tomados (with their own preparation), el
 * reloj y el Límite diario descontados. Pure: no I/O.
 */
export function computeSlots({
  from,
  to,
  branch,
  availabilityIntervals,
  overridesByDate,
  bookedRanges,
  durationMinutes,
  prepMinutes,
  fullDates,
  now,
}: ComputeSlotsInput): DaySlots[] {
  const today = localDate(now, branch.timeZone);
  const days: DaySlots[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (date < today) continue;

    const override = overridesByDate.get(date);
    if (override && override.coveredByEmployeeId != null) {
      days.push({
        date,
        slots: [],
        reason: 'COVERED',
        coveredByEmployeeId: override.coveredByEmployeeId,
      });
      continue;
    }

    const dayIntervals = override
      ? override.intervals
      : availabilityIntervals.filter((i) => i.weekday === weekdayOf(date));

    const candidates: Date[] = [];
    for (const interval of dayIntervals) {
      const clipped = clip(interval, branch.opensAt, branch.closesAt);
      if (!clipped) continue;
      const endMin = toMinutes(clipped.endTime);
      for (
        let t = toMinutes(clipped.startTime) + prepMinutes;
        t + durationMinutes <= endMin;
        t += GRID_MINUTES
      )
        candidates.push(zonedTimeToUtc(date, toHHMM(t), branch.timeZone));
    }

    const slots = fullDates.has(date)
      ? []
      : candidates.filter((start) => {
          if (start < now) return false;
          const held = new Date(start.getTime() - prepMinutes * 60_000);
          const end = new Date(start.getTime() + durationMinutes * 60_000);
          return !bookedRanges.some(
            (b) => b.prepStartsAt < end && b.endsAt > held,
          );
        });

    days.push({
      date,
      slots: slots.map((d) => d.toISOString()),
      reason:
        candidates.length === 0
          ? 'NOT_WORKING'
          : slots.length === 0
            ? 'FULLY_BOOKED'
            : undefined,
    });
  }

  return days;
}
