import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { AvailabilitySummary } from '../../domain/availabilities/availability';
import { BusinessRuleError } from '../../domain/errors';

/** The Availability a Usuario attends a Servicio with when none is named. */
export async function defaultAvailability(
  availabilities: AvailabilitiesRepository,
  userId: number,
): Promise<AvailabilitySummary> {
  const found = (await availabilities.listByUser(userId)).find(
    (availability) => availability.isDefault,
  );
  if (!found)
    throw new BusinessRuleError(
      `El Usuario ${userId} no tiene una Availability predeterminada`,
    );
  return found;
}
