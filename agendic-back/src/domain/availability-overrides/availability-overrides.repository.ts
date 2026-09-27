import {
  AvailabilityOverride,
  AvailabilityOverrideInterval,
} from './availability-override';

export const AVAILABILITY_OVERRIDES_REPOSITORY = Symbol(
  'AvailabilityOverridesRepository',
);

export interface AvailabilityOverridesRepository {
  /** Grouped by date, ordered by date then startTime. */
  listByEmployee(employeeId: number): Promise<AvailabilityOverride[]>;
  /**
   * Replaces the date's whole set of Franjas, atomically; empty is a día libre. When
   * coveredByEmployeeId is given, reassigns that date's BOOKED Turnos of employeeId to it in the same
   * transaction. Throws ConflictError, saving nothing, if one collides with a Turno the cubridor
   * already has.
   */
  replace(
    employeeId: number,
    date: string,
    intervals: AvailabilityOverrideInterval[],
    coveredByEmployeeId: number | null,
  ): Promise<AvailabilityOverride>;
  /** Doesn't revert Turnos an earlier Cobertura already reassigned. */
  delete(employeeId: number, date: string): Promise<void>;
}
