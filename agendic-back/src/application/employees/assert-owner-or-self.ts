import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { ForbiddenError } from '../../domain/errors';
import { assertBusinessExists } from '../businesses/assert-owner';

/**
 * Lets through the Dueño of the Negocio, or the Usuario acting on their own active Empleado of that Negocio (ADR 0017).
 *
 * @returns whether userId is the Dueño
 * @throws {NotFoundError} the Negocio doesn't exist
 * @throws {ForbiddenError} userId is neither the Dueño nor that Empleado
 */
export async function assertOwnerOrSelf(
  employees: EmployeesRepository,
  businesses: BusinessesRepository,
  businessId: number,
  employeeId: number,
  userId: number,
): Promise<boolean> {
  const business = await businesses.findById(businessId);
  assertBusinessExists(business);
  if (business.ownerId === userId) return true;
  const employee = await employees.findById(employeeId);
  if (
    !employee ||
    employee.userId !== userId ||
    employee.businessId !== businessId ||
    employee.deletedAt !== null
  )
    throw new ForbiddenError(
      'Only the Dueño or that same Empleado can do this',
    );
  return false;
}
