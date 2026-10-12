import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { NotFoundError } from '../../domain/errors';
import { ServicesRepository } from '../../domain/services/services.repository';

/** Filtros opcionales de analíticas, todos del Negocio pedido; `employeeId` es solo del Dueño. */
export type BusinessAnalyticsFilters = {
  branchId?: number;
  serviceId?: number;
  employeeId?: number;
};

/**
 * Cada filtro pedido tiene que ser del Negocio; un Empleado dado de baja sigue valiendo como filtro (historial).
 *
 * @throws {NotFoundError} la Sucursal, el Servicio o el Empleado no es del Negocio
 */
export async function assertFiltersBelong(
  services: ServicesRepository,
  employees: EmployeesRepository,
  businessId: number,
  branches: { id: number }[],
  { branchId, serviceId, employeeId }: BusinessAnalyticsFilters,
) {
  const branchIds = new Set(branches.map((b) => b.id));
  if (branchId !== undefined && !branchIds.has(branchId))
    throw new NotFoundError(`Branch ${branchId} not found`);
  if (serviceId !== undefined) {
    const service = await services.findById(serviceId);
    if (service?.branchId == null || !branchIds.has(service.branchId))
      throw new NotFoundError(`Service ${serviceId} not found`);
  }
  if (employeeId !== undefined) {
    const employee = await employees.findById(employeeId);
    if (employee?.businessId !== businessId)
      throw new NotFoundError(`Employee ${employeeId} not found`);
  }
}
