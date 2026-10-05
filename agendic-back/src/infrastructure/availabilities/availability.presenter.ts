import {
  Availability,
  AvailabilitySummary,
} from '../../domain/availabilities/availability';

export const presentAvailabilitySummary = ({
  id,
  name,
  isDefault,
  timeZone,
}: AvailabilitySummary) => ({ id, name, isDefault, timeZone });

export const presentAvailability = (availability: Availability) => ({
  ...presentAvailabilitySummary(availability),
  schedule: availability.schedule.map((ranges) =>
    ranges.map(({ start, end }) => ({ start, end })),
  ),
  overrides: availability.overrides.map(({ date, ranges }) => ({
    date,
    ranges: ranges.map(({ start, end }) => ({ start, end })),
  })),
});
