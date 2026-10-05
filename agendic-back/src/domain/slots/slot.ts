import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Availability } from '../availabilities/availability';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Horario reservable: why a day has none, when it doesn't. */
export type SlotsReason = 'NOT_WORKING' | 'FULLY_BOOKED';

export interface DaySlots {
  /** A local date in the Sucursal's time zone. */
  date: string; // YYYY-MM-DD
  /** ISO instants, one per Horario reservable. Empty when reason is set. */
  slots: string[];
  reason?: SlotsReason;
}

const MINUTE_MS = 60_000;

/** Start alignments tried from the largest: the first that divides the frequency wins. */
const ALIGNMENTS = [60, 30, 20, 15, 10, 5];

/** Millisecond range [start, end). */
interface Range {
  start: number;
  end: number;
}

/** Adds calendar days to a YYYY-MM-DD date. */
export const addDays = (date: string, days: number): string =>
  dayjs.utc(date).add(days, 'day').format('YYYY-MM-DD');

/** The local calendar date (YYYY-MM-DD) an instant falls on in timeZone. */
export const localDate = (instant: Date, timeZone: string): string =>
  dayjs(instant).tz(timeZone).format('YYYY-MM-DD');

/** A local date + HH:mm in timeZone, as the UTC instant it denotes. dayjs resolves the daylight-saving shift. */
const instantAt = (date: string, time: string, timeZone: string): number =>
  dayjs.tz(`${date} ${time}`, timeZone).valueOf();

/** The local date `instant` falls on in timeZone, as the half-open UTC range [from, to) it spans. */
export const localDayBounds = (
  instant: Date,
  timeZone: string,
): { date: string; from: Date; to: Date } => {
  const date = localDate(instant, timeZone);
  return {
    date,
    from: new Date(instantAt(date, '00:00', timeZone)),
    to: new Date(instantAt(addDays(date, 1), '00:00', timeZone)),
  };
};

/** Rounds an instant up to a multiple of `minutes` on the wall clock of timeZone. */
const ceilToWallClock = (ms: number, minutes: number, timeZone: string) => {
  const offset = dayjs(ms).tz(timeZone).utcOffset() * MINUTE_MS;
  const step = minutes * MINUTE_MS;
  return Math.ceil((ms + offset) / step) * step - offset;
};

/** The Availability's Franjas for a local date, or its Anulación's if it has one. 23:59 reaches midnight. */
const rangesOf = (
  {
    timeZone,
    schedule,
    overrides,
  }: Pick<Availability, 'timeZone' | 'schedule' | 'overrides'>,
  date: string,
): Range[] =>
  (
    overrides.find((o) => o.date === date)?.ranges ??
    schedule[dayjs.utc(date).day()]
  ).map(({ start, end }) => ({
    start: instantAt(date, start, timeZone),
    end:
      end === '23:59'
        ? instantAt(addDays(date, 1), '00:00', timeZone)
        : instantAt(date, end, timeZone),
  }));

/** Both lists sorted by start: one pass, each busy range visited only by the ranges it touches. */
const subtract = (ranges: Range[], busy: Range[]): Range[] => {
  const free: Range[] = [];
  let first = 0;
  for (const range of ranges) {
    while (first < busy.length && busy[first].end <= range.start) first++;
    let cursor = range.start;
    for (let i = first; i < busy.length && busy[i].start < range.end; i++) {
      if (busy[i].start > cursor) free.push({ start: cursor, end: busy[i].start });
      cursor = Math.max(cursor, busy[i].end);
    }
    if (cursor < range.end) free.push({ start: cursor, end: range.end });
  }
  return free;
};

export interface ComputeSlotsInput {
  /** Local dates in the Sucursal's time zone. */
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  /** The "día": dates are grouped, starts aligned and the Límite diario counted in the Sucursal's zone. */
  timeZone: string;
  /** The Availability the Empleado attends the Servicio with: its Franjas and Anulaciones, read in its own zone. */
  availability: Pick<Availability, 'timeZone' | 'schedule' | 'overrides'>;
  /** PENDING and BOOKED Turnos of this Empleado, in any of their Servicios, each from its own preparation on. */
  bookedRanges: { prepStartsAt: Date; endsAt: Date }[];
  durationMinutes: number;
  /** Tiempo de preparación of the Servicio asked for: held before each Horario reservable. */
  prepMinutes: number;
  /** Intervalo; the duration when null. */
  slotInterval: number | null;
  /** Anticipación mínima. */
  minimumNoticeMinutes: number;
  /** Local dates of the Sucursal on which the Servicio already reached its Límite diario. */
  fullDates: Set<string>;
  now: Date;
}

/**
 * Horarios reservables, after cal.diy: Franjas (or the Anulación) of each date in the Availability's zone become
 * ranges → the Empleado's Turnos, each from its preparation, are subtracted → each range is cut every
 * Intervalo from the later of its start plus preparation and `now` plus Anticipación mínima, rounded up to the
 * alignment → grouped by date of the Sucursal, the Límite diario emptying a full day. Pure: no I/O.
 */
export function computeSlots({
  from,
  to,
  timeZone,
  availability,
  bookedRanges,
  durationMinutes,
  prepMinutes,
  slotInterval,
  minimumNoticeMinutes,
  fullDates,
  now,
}: ComputeSlotsInput): DaySlots[] {
  const frequency = slotInterval ?? durationMinutes;
  const alignment = ALIGNMENTS.find((a) => frequency % a === 0) ?? 1;

  const cut = (ranges: Range[], notBefore: number): Set<number> => {
    const starts = new Set<number>();
    for (const range of ranges) {
      let start = ceilToWallClock(
        Math.max(range.start + prepMinutes * MINUTE_MS, notBefore),
        alignment,
        timeZone,
      );
      for (
        ;
        start + durationMinutes * MINUTE_MS <= range.end;
        start += frequency * MINUTE_MS
      )
        starts.add(start);
    }
    return starts;
  };

  // A day of slack either side (wider than any UTC offset) covers every Sucursal date in [from, to].
  const working: Range[] = [];
  for (let d = addDays(from, -1); d <= addDays(to, 1); d = addDays(d, 1))
    working.push(...rangesOf(availability, d));
  working.sort((a, b) => a.start - b.start);

  const busy = bookedRanges
    .map((b) => ({ start: b.prepStartsAt.getTime(), end: b.endsAt.getTime() }))
    .sort((a, b) => a.start - b.start);

  const byDate = (starts: Set<number>) => {
    const dates = new Map<string, number[]>();
    for (const ms of starts) {
      const date = localDate(new Date(ms), timeZone);
      dates.set(date, [...(dates.get(date) ?? []), ms]);
    }
    return dates;
  };
  const fitsByDate = byDate(cut(working, -Infinity));
  const freeByDate = byDate(
    cut(
      subtract(working, busy),
      now.getTime() + minimumNoticeMinutes * MINUTE_MS,
    ),
  );

  const today = localDate(now, timeZone);
  const days: DaySlots[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (date < today) continue;
    const slots = fullDates.has(date)
      ? []
      : (freeByDate.get(date) ?? []).sort((a, b) => a - b);
    days.push({
      date,
      slots: slots.map((ms) => new Date(ms).toISOString()),
      reason: !fitsByDate.has(date)
        ? 'NOT_WORKING'
        : slots.length === 0
          ? 'FULLY_BOOKED'
          : undefined,
    });
  }
  return days;
}
