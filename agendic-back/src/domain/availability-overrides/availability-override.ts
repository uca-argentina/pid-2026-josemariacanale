import { TimeRange } from '../availabilities/availability';

/**
 * Anulación: replaces an Availability's Franjas for one concrete date, read in the Availability's time
 * zone. An empty `ranges` is a día libre.
 */
export interface AvailabilityOverride {
  date: string; // YYYY-MM-DD
  /** Ordered by start. Empty is a día libre. */
  ranges: TimeRange[];
}
