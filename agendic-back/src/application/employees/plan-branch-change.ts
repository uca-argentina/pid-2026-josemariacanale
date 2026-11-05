import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import {
  BadRequestError,
  BusinessRuleError,
  NotFoundError,
} from '../../domain/errors';
import { ServicesRepository } from '../../domain/services/services.repository';
import { isLastEmployee } from '../services/is-last-employee';
import { assertEmployeeOwner } from './assert-employee-owner';

/** What changing an Empleado's Sucursales does: the Empleado, the Sucursales (ascending) they end up in and those they lose. */
export interface BranchChangePlan {
  employee: Employee;
  branchIds: number[];
  lostBranchIds: number[];
}

/**
 * Valida el cambio de Sucursales de un Empleado, en el orden del contrato, antes de leer o escribir nada más.
 *
 * @throws {NotFoundError} el Empleado no existe o está dado de baja
 * @throws {ForbiddenError} el Usuario no es el Dueño del Negocio del Empleado
 * @throws {BadRequestError} `branchIds` viene vacío
 * @throws {BusinessRuleError} una Sucursal no es del Negocio, se le saca una Sucursal al Dueño, o sacarlo deja sin Empleados a un Servicio
 */
export async function planBranchChange(
  deps: {
    employees: EmployeesRepository;
    businesses: BusinessesRepository;
    branches: BranchesRepository;
    services: ServicesRepository;
  },
  userId: number,
  employeeId: number,
  branchIds: number[],
): Promise<BranchChangePlan> {
  const employee = await assertEmployeeOwner(
    deps.employees,
    deps.businesses,
    employeeId,
    userId,
  );
  if (employee.deletedAt !== null)
    throw new NotFoundError(`Employee ${employeeId} not found`);
  if (branchIds.length === 0)
    throw new BadRequestError('branchIds must have at least one Branch');

  const ofBusiness = (
    await deps.branches.listByBusiness(employee.businessId)
  ).map(({ id }) => id);
  const known = new Set(ofBusiness);
  const foreign = branchIds.find((id) => !known.has(id));
  if (foreign !== undefined)
    throw new BusinessRuleError(
      `Branch ${foreign} is not a Branch of Business ${employee.businessId}`,
    );

  const chosen = new Set(branchIds);
  // assertEmployeeOwner proved userId owns the Negocio, so this is the Dueño's own Empleado.
  if (employee.userId === userId && ofBusiness.some((id) => !chosen.has(id)))
    throw new BusinessRuleError('The Dueño works at every Branch');

  const lostBranchIds = employee.branchIds.filter((id) => !chosen.has(id));
  if (lostBranchIds.length > 0) {
    const lost = new Set(lostBranchIds);
    const services = await deps.services.listActiveByEmployee(employee.id);
    const last = services.find(
      (service) =>
        service.branchId !== null &&
        lost.has(service.branchId) &&
        isLastEmployee(service, employee.id),
    );
    if (last)
      throw new BusinessRuleError(
        `Employee ${employee.id} is the last Employee of Service ${last.id}`,
      );
  }
  return {
    employee,
    branchIds: [...chosen].sort((a, b) => a - b),
    lostBranchIds,
  };
}
