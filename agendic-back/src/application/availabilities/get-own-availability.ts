import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { Availability } from '../../domain/availabilities/availability';
import { NotFoundError } from '../../domain/errors';

/** Loads an Availability of the Usuario; one of someone else's looks like one that doesn't exist. */
export async function getOwnAvailability(
  availabilities: AvailabilitiesRepository,
  availabilityId: number,
  userId: number,
): Promise<Availability> {
  const availability = await availabilities.findById(availabilityId);
  if (!availability || availability.userId !== userId)
    throw new NotFoundError(`Availability ${availabilityId} not found`);
  return availability;
}
