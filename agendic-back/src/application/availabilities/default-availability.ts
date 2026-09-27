import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { Availability } from '../../domain/availabilities/availability';
import { BusinessRuleError } from '../../domain/errors';

/** The Availability an Empleado attends a Servicio with when none is named. */
export async function defaultAvailability(
  availabilities: AvailabilitiesRepository,
  employeeId: number,
): Promise<Availability> {
  const found = (await availabilities.listByEmployee(employeeId)).find(
    (availability) => availability.isDefault,
  );
  if (!found)
    throw new BusinessRuleError(
      'El Empleado no tiene una Availability predeterminada',
    );
  return found;
}
