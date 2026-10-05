import { AvailabilityOverride } from '../availability-overrides/availability-override';
import { BusinessRuleError } from '../errors';
import { isIanaTimeZone } from '../time-zone';

/** A stretch of a day, read in the Availability's time zone. Never crosses midnight. */
export interface TimeRange {
  start: string; // HH:mm
  end: string; // HH:mm
}

/** A week of Franjas: one list of ranges per day, `[0]` = Sunday … `[6]` = Saturday (as dayjs().day()). A day with none is not worked. */
export type Schedule = TimeRange[][];

/** Availability: the weekly Franjas and the Anulaciones of a Usuario, in their own time zone. Exactly one per Usuario is the default. */
export interface Availability {
  id: number;
  userId: number;
  name: string;
  /** IANA name. */
  timeZone: string;
  isDefault: boolean;
  schedule: Schedule;
  /** Ordered by date. */
  overrides: AvailabilityOverride[];
}

export type AvailabilitySummary = Omit<Availability, 'schedule' | 'overrides'>;

export type AvailabilityFields = Pick<
  Availability,
  'name' | 'timeZone' | 'schedule' | 'overrides'
>;

export const emptySchedule = (): Schedule =>
  Array.from({ length: 7 }, () => []);

/** What every Usuario is born with: Monday to Friday 09:00–17:00 in Buenos Aires, the default. */
export const DEFAULT_AVAILABILITY: AvailabilityFields = {
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  schedule: emptySchedule().map((_, day) =>
    day >= 1 && day <= 5 ? [{ start: '09:00', end: '17:00' }] : [],
  ),
  overrides: [],
};

const DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/**
 * Ranges of one day may touch (09:00–17:00 and 17:00–18:00) but not overlap. HH:mm strings are zero-padded and
 * same length, so lexical comparison matches time-of-day order.
 *
 * @throws {BusinessRuleError} naming `label` when a range ends before it starts, or two overlap
 */
function assertValidRanges(ranges: TimeRange[], label: string): void {
  const bad = ranges.find(({ start, end }) => end <= start);
  if (bad)
    throw new BusinessRuleError(
      `${label}: el rango ${bad.start}–${bad.end} tiene que terminar después de empezar`,
    );
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const clash = sorted.find((range, i) => i > 0 && range.start < sorted[i - 1].end);
  if (clash)
    throw new BusinessRuleError(
      `${label}: el rango ${clash.start}–${clash.end} se solapa con otro`,
    );
}

/**
 * @throws {BusinessRuleError} la zona no es IANA, un rango termina antes de empezar o se pisa con otro del mismo día, o hay dos Anulaciones de una fecha
 */
export function assertValidAvailability(fields: AvailabilityFields): void {
  if (!isIanaTimeZone(fields.timeZone))
    throw new BusinessRuleError(
      `La zona horaria ${fields.timeZone} no es una zona IANA válida`,
    );
  fields.schedule.forEach((ranges, day) =>
    assertValidRanges(ranges, `El ${DAY_NAMES[day]}`),
  );
  const dates = new Set<string>();
  for (const { date, ranges } of fields.overrides) {
    if (dates.has(date))
      throw new BusinessRuleError(`La fecha ${date} está repetida`);
    dates.add(date);
    assertValidRanges(ranges, `La fecha ${date}`);
  }
}

/** A Franja as stored: one range shared by several days. */
export interface Interval extends TimeRange {
  days: number[];
}

/**
 * Groups the ranges with the same start and end into one Franja with several days, in the order they first
 * appear going from Sunday on (as getAvailabilityFromSchedule of cal.diy).
 */
export function scheduleToIntervals(schedule: Schedule): Interval[] {
  const byRange = new Map<string, Interval>();
  schedule.forEach((ranges, day) =>
    ranges.forEach(({ start, end }) => {
      const key = `${start}-${end}`;
      const interval = byRange.get(key);
      if (interval) interval.days.push(day);
      else byRange.set(key, { days: [day], start, end });
    }),
  );
  return [...byRange.values()];
}

/** Inverse of scheduleToIntervals; each day's ranges ordered by start. */
export function intervalsToSchedule(intervals: Interval[]): Schedule {
  const schedule = emptySchedule();
  for (const { days, start, end } of intervals)
    for (const day of days) schedule[day].push({ start, end });
  return schedule.map((ranges) =>
    ranges.sort((a, b) => a.start.localeCompare(b.start)),
  );
}
