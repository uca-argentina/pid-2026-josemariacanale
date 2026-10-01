import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { Service } from '../../domain/services/service';
import { assertBranchExists } from '../branches/assert-branch-owner';
import { assertOwnerOrSelf } from '../employees/assert-owner-or-self';

/**
 * Lets through the Dueño of the Service's Negocio, or the Usuario acting on their own active Empleado of it (ADR 0017).
 *
 * @returns the Service's Sucursal, and whether userId is the Dueño
 * @throws {NotFoundError} the Service's Sucursal or Negocio doesn't exist
 * @throws {ForbiddenError} userId is neither the Dueño nor that Empleado
 */
export async function assertServiceOwnerOrSelf(
  branches: BranchesRepository,
  businesses: BusinessesRepository,
  employees: EmployeesRepository,
  service: Service,
  employeeId: number,
  userId: number,
): Promise<{ branch: Branch; isOwner: boolean }> {
  const branch = await branches.findById(service.branchId);
  assertBranchExists(branch);
  const isOwner = await assertOwnerOrSelf(
    employees,
    businesses,
    branch.businessId,
    employeeId,
    userId,
  );
  return { branch, isOwner };
}
