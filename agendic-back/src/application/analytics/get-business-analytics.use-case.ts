import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsBreakdown,
  AnalyticsRepository,
  EmployeeRankings,
  Granularity,
  KpiName,
} from '../../domain/analytics/analytics.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { BusinessAnalyticsFilters } from './assert-filters-belong';
import { KpiPair, pairKpis, parseAnalyticsRange } from './analytics-range';
import { resolveBusinessScope } from './resolve-business-scope';

type Option = { id: number; name: string };

/**
 * Las analíticas del Negocio. Los rankings y `filterOptions.employees` vienen solo para el Dueño: el
 * Empleado que no lo es no los recibe.
 */
export type BusinessAnalytics = AnalyticsBreakdown &
  Partial<EmployeeRankings> & {
    kpis: Record<KpiName, KpiPair>;
    granularity: Granularity;
    filterOptions: {
      branches: Option[];
      services: Option[];
      employees?: Option[];
    };
  };

/** Analíticas de los Servicios del Negocio, según el rol de quien mira. */
@Injectable()
export class GetBusinessAnalyticsUseCase {
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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los KPIs del Negocio en el rango, cada uno con su valor en el período anterior, más la tendencia, el
   * ranking de Servicios y las Calificaciones recientes, de todos los Servicios del Negocio (ocultos y dados
   * de baja incluidos). El Dueño ve todo el Negocio y además los rankings de Empleados; un Empleado que no es
   * Dueño ve solo los Turnos que atiende en este Negocio. La zona de cada Turno es la de su Sucursal.
   *
   * @throws {BadRequestError} una fecha mal formada, `from` > `to`, o más de 366 días entre las dos
   * @throws {NotFoundError} el Negocio no existe o está dado de baja, o un filtro no es del Negocio
   * @throws {ForbiddenError} el Usuario no es Empleado vigente del Negocio, o no es Dueño y filtra por Empleado
   */
  async execute(
    userId: number,
    businessId: number,
    from: unknown,
    to: unknown,
    filters: BusinessAnalyticsFilters = {},
  ): Promise<BusinessAnalytics> {
    const { range, previous, granularity } = parseAnalyticsRange(from, to);
    const { scope, isOwner, branches } = await resolveBusinessScope(
      {
        businesses: this.businesses,
        employees: this.employees,
        branches: this.branches,
        services: this.services,
      },
      userId,
      businessId,
      filters,
    );
    const { serviceId } = filters;
    const now = this.clock.now();
    const user = await this.users.findById(userId);
    const [
      currentKpis,
      previousKpis,
      breakdown,
      services,
      rankings,
      employees,
    ] = await Promise.all([
      this.analytics.kpis(scope, range, now, serviceId),
      this.analytics.kpis(scope, previous, now, serviceId),
      this.analytics.breakdown(
        scope,
        range,
        now,
        granularity,
        user?.weekStart ?? 1,
        serviceId,
      ),
      this.analytics.businessServices(businessId),
      isOwner ? this.analytics.employeeRankings(scope, range, serviceId) : null,
      isOwner ? this.employees.listActiveByBusiness(businessId) : null,
    ]);
    return {
      ...breakdown,
      ...rankings,
      granularity,
      kpis: pairKpis(currentKpis, previousKpis),
      filterOptions: {
        branches: branches.map(({ id, name }) => ({ id, name })),
        services,
        ...(employees && {
          employees: employees.map(({ id, name }) => ({ id, name })),
        }),
      },
    };
  }
}
