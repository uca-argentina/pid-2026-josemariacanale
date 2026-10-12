import { AnalyticsScope } from '../../domain/analytics/analytics.repository';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { ForbiddenError, NotFoundError } from '../../domain/errors';
import { ServicesRepository } from '../../domain/services/services.repository';
import {
  assertFiltersBelong,
  BusinessAnalyticsFilters,
} from './assert-filters-belong';

/**
 * El alcance de analíticas del Negocio para quien mira: el Dueño ve todo el Negocio, un Empleado que no lo
 * es queda forzado a sus propios Turnos.
 *
 * @throws {NotFoundError} el Negocio no existe o está dado de baja, o un filtro no es del Negocio
 * @throws {ForbiddenError} el Usuario no es Empleado vigente del Negocio, o no es Dueño y filtra por Empleado
 */
export async function resolveBusinessScope(
  repositories: {
    businesses: BusinessesRepository;
    employees: EmployeesRepository;
    branches: BranchesRepository;
    services: ServicesRepository;
  },
  userId: number,
  businessId: number,
  filters: BusinessAnalyticsFilters,
): Promise<{
  scope: Extract<AnalyticsScope, { kind: 'business' }>;
  isOwner: boolean;
  branches: { id: number; name: string }[];
}> {
  const { businesses, employees, branches, services } = repositories;
  const business = await businesses.findById(businessId);
  if (!business || business.deletedAt)
    throw new NotFoundError(`Business ${businessId} not found`);
  const own = (await employees.listActiveByUser(userId)).find(
    (e) => e.businessId === businessId,
  );
  if (!own)
    throw new ForbiddenError(
      `Only Employees of Business ${businessId} can see its analytics`,
    );
  const isOwner = business.ownerId === userId;
  if (!isOwner && filters.employeeId !== undefined)
    throw new ForbiddenError('Only the owner can filter by Employee');

  const businessBranches = await branches.listByBusiness(businessId);
  await assertFiltersBelong(
    services,
    employees,
    businessId,
    businessBranches,
    filters,
  );
  return {
    scope: {
      kind: 'business',
      businessId,
      branchId: filters.branchId,
      employeeId: isOwner ? filters.employeeId : own.id,
    },
    isOwner,
    branches: businessBranches,
  };
}
