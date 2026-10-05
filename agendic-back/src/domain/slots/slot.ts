import { Availability } from '../availabilities/availability';
import { Branch } from '../branches/branch';

/** Horario reservable: why a day has none, when it doesn't. */
export type SlotsReason = 'NOT_WORKING' | 'FULLY_BOOKED';

export interface DaySlots {
  /** A local date in the Availability's time zone. */
  date: string; // YYYY-MM-DD
  /** ISO instants, one per Horario reservable. Empty when reason is set. */
  slots: string[];
  reason?: SlotsReason;
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

/** The HH:mm an instant shows on the wall clock in timeZone. */
const localTime = (instant: Date, timeZone: string): string =>
  toHHMM(
    Math.floor((wallClockMsInZone(instant, timeZone) % 86_400_000) / 60_000),
  );

export interface ComputeSlotsInput {
  /** Local dates in the Availability's time zone. */
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  /** Where the Servicio is attended: its hours still bound the Horarios reservables, in its own zone. */
  branch: Pick<Branch, 'opensAt' | 'closesAt' | 'timeZone'>;
  /** The Availability the Empleado attends the Servicio with: its Franjas and Anulaciones, read in its zone. */
  availability: Pick<Availability, 'timeZone' | 'schedule' | 'overrides'>;
  /** PENDING and BOOKED Turnos of this Empleado, in any of their Servicios, each from its own preparation on. */
  bookedRanges: { prepStartsAt: Date; endsAt: Date }[];
  durationMinutes: number;
  /** Tiempo de preparación of the Servicio asked for: held before each Horario reservable, inside the Franja. */
  prepMinutes: number;
  /** Local dates of the Sucursal on which the Servicio already reached its Límite diario. */
  fullDates: Set<string>;
  now: Date;
}

/**
 * Availability Franjas → replaced by that date's Anulación, if any → grillado de a 15' from the end of the
 * preparation → bounded by the Sucursal's hours → Turnos tomados (with their own preparation), el reloj y
 * el Límite diario descontados. Pure: no I/O.
 */
export function computeSlots({
  from,
  to,
  branch,
  availability,
  bookedRanges,
  durationMinutes,
  prepMinutes,
  fullDates,
  now,
}: ComputeSlotsInput): DaySlots[] {
  const { timeZone } = availability;
  const today = localDate(now, timeZone);
  const overrides = new Map(availability.overrides.map((o) => [o.date, o]));
  const days: DaySlots[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (date < today) continue;

    const ranges =
      overrides.get(date)?.ranges ?? availability.schedule[weekdayOf(date)];

    const candidates: Date[] = [];
    for (const range of ranges) {
      const endMin = toMinutes(range.end);
      for (
        let t = toMinutes(range.start) + prepMinutes;
        t + durationMinutes <= endMin;
        t += GRID_MINUTES
      ) {
        const start = zonedTimeToUtc(date, toHHMM(t), timeZone);
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        if (
          localTime(start, branch.timeZone) >= branch.opensAt &&
          localTime(end, branch.timeZone) <= branch.closesAt
        )
          candidates.push(start);
      }
    }

    const slots = candidates.filter((start) => {
      if (start < now) return false;
      if (fullDates.has(localDate(start, branch.timeZone))) return false;
      const held = new Date(start.getTime() - prepMinutes * 60_000);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      return !bookedRanges.some((b) => b.prepStartsAt < end && b.endsAt > held);
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
