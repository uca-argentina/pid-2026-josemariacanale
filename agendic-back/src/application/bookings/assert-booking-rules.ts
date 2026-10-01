import { assertBranchExists } from '../branches/assert-branch-owner';
import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { DAILY_LIMIT_REACHED } from '../../domain/bookings/booking';
import { BusinessRuleError, ConflictError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import { localDayBounds } from '../../domain/slots/slot';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUENOS_AIRES,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// ponytail: every Sucursal is assumed to be in Argentina; add a per-Sucursal timezone if the business expands abroad.
const localTime = (date: Date) => timeFormatter.format(date).replace('24:', '00:');

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

/** Half-open: ending exactly at closing time is accepted. */
export function assertWithinHours(
  branch: Branch,
  startsAt: Date,
  endsAt: Date,
): void {
  if (localTime(startsAt) < branch.opensAt || localTime(endsAt) > branch.closesAt)
    throw new BusinessRuleError(
      "Booking must fit within the Sucursal's hours",
    );
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
 * Every rule shared by creation and verification, except the hours check: the caller supplies endsAt,
 * since verification must check the Booking's endsAt as fixed at creation, not one recomputed from a
 * Servicio duration that may have changed since.
 */
export async function assertBookable(
  services: ServicesRepository,
  branches: BranchesRepository,
  serviceId: number,
  employeeId: number,
  startsAt: Date,
  now: Date,
): Promise<{ service: Service; branch: Branch }> {
  const service = await services.findById(serviceId);
  assertServiceBookable(service);
  assertEmployeeInCharge(service, employeeId);
  assertNotPast(startsAt, now);
  const branch = await branches.findById(service.branchId);
  assertBranchExists(branch);
  return { service, branch };
}
