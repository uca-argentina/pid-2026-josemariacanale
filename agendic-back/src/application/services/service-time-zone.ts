import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';

/**
 * The zone in which a Servicio's "día" is read (grouping by date, aligning, counting the Límite diario): its
 * Sucursal's, or its Availability's in a Servicio personal (ADR 0021).
 *
 * @throws {NotFoundError} the Sucursal or the Availability doesn't exist
 */
export async function serviceTimeZone(
  branches: BranchesRepository,
  availabilities: AvailabilitiesRepository,
  service: Service,
): Promise<string> {
  if (service.branchId !== null) {
    const branch = await branches.findById(service.branchId);
    if (!branch) throw new NotFoundError('Branch not found');
    return branch.timeZone;
  }
  const availability = await availabilities.findById(service.availabilityId!);
  if (!availability)
    throw new NotFoundError(`Availability ${service.availabilityId} not found`);
  return availability.timeZone;
}
