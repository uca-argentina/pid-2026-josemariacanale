import { assertBranchExists } from '../branches/assert-branch-owner';
import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { DAILY_LIMIT_REACHED } from '../../domain/bookings/booking';
import { BusinessRuleError, ConflictError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import { localDayBounds } from '../../domain/slots/slot';

export function assertServiceBookable(
  service: Service | null,
): asserts service is Service {
  if (!service || service.retiredAt)
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
 * Checks the Límite diario of the local day of the Sucursal that `startsAt` falls on.
 *
 * @throws {ConflictError} el Servicio ya tiene `dailyLimit` Turnos pendientes o aceptados ese día de la Sucursal
 */
export async function assertUnderDailyLimit(
  bookings: BookingsRepository,
  service: Service,
  branch: Branch,
  startsAt: Date,
): Promise<void> {
  if (service.dailyLimit === null) return;
  const { from, to } = localDayBounds(startsAt, branch.timeZone);
  const taken = await bookings.listOccupiedStartsByService(service.id, from, to);
  if (taken.length >= service.dailyLimit)
    throw new ConflictError(DAILY_LIMIT_REACHED);
}

/**
 * Every rule shared by creation and verification, except the Horario reservable check: Reservar runs it
 * apart with `pickEmployee`, and verification does not run it. Without `employeeId` (Reservar, which still
 * has to assign one) it skips the Empleado check.
 */
export async function assertBookable(
  services: ServicesRepository,
  branches: BranchesRepository,
  serviceId: number,
  employeeId: number | undefined,
  startsAt: Date,
  now: Date,
): Promise<{ service: Service; branch: Branch }> {
  const service = await services.findById(serviceId);
  assertServiceBookable(service);
  if (employeeId !== undefined) assertEmployeeInCharge(service, employeeId);
  assertNotPast(startsAt, now);
  const branch = await branches.findById(service.branchId);
  assertBranchExists(branch);
  return { service, branch };
}
