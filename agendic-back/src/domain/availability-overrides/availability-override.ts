import { BusinessRuleError } from '../errors';

/** Franja de una Anulación: same shape as an Availability's, but for one date instead of a weekday. */
export interface AvailabilityOverrideInterval {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

/**
 * Anulación: replaces an Empleado's Franjas for one concrete date, for every Servicio they attend. An
 * empty `intervals` is a día libre.
 */
export interface AvailabilityOverride {
  employeeId: number;
  date: string; // YYYY-MM-DD
  /** Ordered by startTime. Empty is a día libre. */
  intervals: AvailabilityOverrideInterval[];
  /** The Empleado attending in this one's place that date, if any. */
  coveredByEmployeeId: number | null;
}

/** Also what the repository answers when the exclusion constraint catches a race. */
export const OVERLAPPING_OVERRIDE_INTERVALS =
  'Dos Franjas del mismo día se solapan';

/**
 * Same rule as an Availability's Franjas (touching accepted, overlapping or backwards rejected), just
 * grouped by date instead of weekday: a Anulación's Franjas are already all the same date.
 */
export function assertValidOverrideIntervals(
  intervals: AvailabilityOverrideInterval[],
): void {
  if (intervals.some(({ startTime, endTime }) => startTime >= endTime))
    throw new BusinessRuleError(
      'Cada Franja tiene que terminar después de empezar',
    );
  const sorted = [...intervals].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  if (
    sorted.some(
      (interval, i) => i > 0 && interval.startTime < sorted[i - 1].endTime,
    )
  )
    throw new BusinessRuleError(OVERLAPPING_OVERRIDE_INTERVALS);
}
