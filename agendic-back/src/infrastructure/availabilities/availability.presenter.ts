import {
  Availability,
  AvailabilitySummary,
} from '../../domain/availabilities/availability';

export const presentAvailabilitySummary = ({
  id,
  name,
  isDefault,
  timeZone,
  schedule,
}: AvailabilitySummary) => ({
  id,
  name,
  isDefault,
  timeZone,
  schedule: schedule.map((ranges) =>
    ranges.map(({ start, end }) => ({ start, end })),
  ),
});

export const presentAvailability = (availability: Availability) => ({
  ...presentAvailabilitySummary(availability),
  overrides: availability.overrides.map(({ date, ranges }) => ({
    date,
    ranges: ranges.map(({ start, end }) => ({ start, end })),
  })),
});
