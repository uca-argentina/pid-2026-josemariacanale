import { BusinessRuleError } from '../errors';

/** Franja: a stretch of one weekday within an Availability. Never crosses midnight. */
export interface AvailabilityInterval {
  /** 0 = Sunday … 6 = Saturday, same as Date.getUTCDay(). */
  weekday: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

/** A named weekly schedule of an Empleado. Exactly one per Empleado is the default. */
export interface Availability {
  id: number;
  employeeId: number;
  name: string;
  isDefault: boolean;
  /** Ordered by weekday, then startTime. A weekday with none is a day not worked. */
  intervals: AvailabilityInterval[];
}

/** Also what the repository answers when the exclusion constraint catches a race. */
export const OVERLAPPING_INTERVALS = 'Dos Franjas del mismo día se solapan';

export type AvailabilityFields = Pick<Availability, 'name' | 'intervals'>;

/** What Crear Negocio gives the Dueño: Monday to Friday 09:00–18:00, weekend off. */
export const DEFAULT_AVAILABILITY: AvailabilityFields = {
  name: 'Horario general',
  intervals: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: '09:00',
    endTime: '18:00',
  })),
};

/**
 * Franjas of the same weekday may touch (09:00–17:00 and 17:00–18:00) but not overlap.
 * HH:mm strings are zero-padded and same length, so lexical comparison matches time-of-day order.
 */
export function assertValidIntervals(intervals: AvailabilityInterval[]): void {
  if (intervals.some(({ startTime, endTime }) => startTime >= endTime))
    throw new BusinessRuleError(
      'Cada Franja tiene que terminar después de empezar',
    );
  const sorted = [...intervals].sort(
    (a, b) =>
      a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );
  if (
    sorted.some(
      (interval, i) =>
        i > 0 &&
        sorted[i - 1].weekday === interval.weekday &&
        interval.startTime < sorted[i - 1].endTime,
    )
  )
    throw new BusinessRuleError(OVERLAPPING_INTERVALS);
}
