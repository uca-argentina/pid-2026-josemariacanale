import { AvailabilityOverride } from '../../domain/availability-overrides/availability-override';

export const presentOverride = (override: AvailabilityOverride) => ({
  date: override.date,
  intervals: override.intervals.map(({ startTime, endTime }) => ({
    startTime,
    endTime,
  })),
  coveredByEmployeeId: override.coveredByEmployeeId,
});
