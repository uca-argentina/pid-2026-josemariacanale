import { Availability } from '../../domain/availabilities/availability';

export const presentAvailability = (availability: Availability) => ({
  id: availability.id,
  employeeId: availability.employeeId,
  name: availability.name,
  isDefault: availability.isDefault,
  intervals: availability.intervals.map(({ weekday, startTime, endTime }) => ({
    weekday,
    startTime,
    endTime,
  })),
});
