import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
  EmployeesPerPeriod,
  Granularity,
} from '../../domain/analytics/analytics.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { parseAnalyticsRange } from './analytics-range';
import { assertFiltersBelong } from './assert-filters-belong';

const GRANULARITIES: readonly unknown[] = ['day', 'week', 'month'];

/** Turnos por Empleado y período de un Negocio, solo para su Dueño. */
@Injectable()
export class GetEmployeesPerPeriodUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analytics: AnalyticsRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  /**
   * La cantidad de Turnos de cada Empleado vigente del Negocio en cada período de `granularity` del rango,
   * cortados en la zona de su Sucursal; la semana arranca en el `weekStart` del Usuario. La granularidad la
   * elige quien pide, no el largo del rango.
   *
   * @throws {BadRequestError} una fecha mal formada, `from` > `to`, más de 366 días entre las dos, o una granularidad que no es `day`, `week` ni `month`
   * @throws {NotFoundError} el Negocio no existe o está dado de baja, o un filtro no es del Negocio
   * @throws {ForbiddenError} el Usuario no es el Dueño del Negocio
   */
  async execute(
    userId: number,
    businessId: number,
    from: unknown,
    to: unknown,
    granularity: unknown,
    filters: { branchId?: number; serviceId?: number } = {},
  ): Promise<EmployeesPerPeriod> {
    const { range } = parseAnalyticsRange(from, to);
    if (!GRANULARITIES.includes(granularity))
      throw new BadRequestError(`Invalid granularity ${String(granularity)}`);
    const business = await this.businesses.findById(businessId);
    if (!business || business.deletedAt)
      throw new NotFoundError(`Business ${businessId} not found`);
    if (business.ownerId !== userId)
      throw new ForbiddenError('Only the owner can see analytics per Employee');
    await assertFiltersBelong(
      this.services,
      this.employees,
      businessId,
      await this.branches.listByBusiness(businessId),
      filters,
    );
    const user = await this.users.findById(userId);
    return this.analytics.employeesPerPeriod(
      { kind: 'business', businessId, branchId: filters.branchId },
      range,
      granularity as Granularity,
      user?.weekStart ?? 1,
      filters.serviceId,
    );
  }
}
