import { assertBranchExists } from '../branches/assert-branch-owner';
import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { DAILY_LIMIT_REACHED } from '../../domain/bookings/booking';
import { BusinessRuleError, ConflictError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import { addDays, localDayBounds } from '../../domain/slots/slot';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

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
 * Checks that `startsAt` is one of the Horarios reservables the Cliente was shown, recalculated now.
 *
 * @throws {BusinessRuleError} `startsAt` is not a Horario reservable of the Servicio for that Empleado
 */
export async function assertSlotAvailable(
  listSlots: ListSlotsUseCase,
  serviceId: number,
  employeeId: number,
  startsAt: Date,
  excludeBookingId?: number,
): Promise<void> {
  // A day of slack either side: the Sucursal's date for `startsAt` is within a day of its UTC date.
  const iso = startsAt.toISOString();
  const utcDate = iso.slice(0, 10);
  const { days } = await listSlots.execute(
    serviceId,
    employeeId,
    addDays(utcDate, -1),
    addDays(utcDate, 1),
    excludeBookingId,
  );
  if (!days.some((day) => day.slots.includes(iso)))
    throw new BusinessRuleError(
      `Slot ${iso} is not available for Service ${serviceId}`,
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
 * Every rule shared by creation and verification, except the Horario reservable check: Reservar runs it
 * apart with `assertSlotAvailable`, and verification does not run it.
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
