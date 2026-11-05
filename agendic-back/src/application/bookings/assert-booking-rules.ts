import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { Branch } from '../../domain/branches/branch';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import { serviceTimeZone } from '../services/service-time-zone';

export function assertServiceBookable(
  service: Service | null,
): asserts service is Service {
  if (!service || service.deletedAt)
    throw new BusinessRuleError('Service not found or retired');
}

export function assertEmployeeInCharge(
  service: Service,
  employeeId: number,
): void {
  if (!service.employees.some((employee) => employee.id === employeeId))
    throw new BusinessRuleError(
      'Employee is not in charge of this Service, verified and active',
    );
}

export function assertNotPast(startsAt: Date, now: Date): void {
  if (startsAt < now)
    throw new BusinessRuleError('startsAt cannot be before now');
}

/**
 * Every rule shared by creation and verification, except the Horario reservable check: Reservar runs it
 * apart with `pickEmployee`, and verification does not run it. Without `employeeId` (Reservar, which still
 * has to assign one) it skips the Empleado check.
 *
 * @returns the Servicio, its Sucursal (null in a Servicio personal) and the zone its day is read in
 * @throws {BusinessRuleError} the Servicio doesn't exist or is retired, the Empleado doesn't attend it, or `startsAt` is past
 * @throws {NotFoundError} the Sucursal or the Availability doesn't exist
 */
export async function assertBookable(
  services: ServicesRepository,
  branches: BranchesRepository,
  availabilities: AvailabilitiesRepository,
  serviceId: number,
  employeeId: number | undefined,
  startsAt: Date,
  now: Date,
): Promise<{ service: Service; branch: Branch | null; timeZone: string }> {
  const service = await services.findById(serviceId);
  assertServiceBookable(service);
  if (employeeId !== undefined) assertEmployeeInCharge(service, employeeId);
  assertNotPast(startsAt, now);
  if (service.branchId === null)
    return {
      service,
      branch: null,
      timeZone: await serviceTimeZone(branches, availabilities, service),
    };
  const branch = await branches.findById(service.branchId);
  if (!branch) throw new NotFoundError(`Branch ${service.branchId} not found`);
  return { service, branch, timeZone: branch.timeZone };
}
