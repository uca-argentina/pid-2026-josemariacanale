import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
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
import { BusinessAnalyticsFilters } from './assert-filters-belong';
import { parseAnalyticsRange } from './analytics-range';
import { bookingsCsv } from './bookings-csv';
import { resolveBusinessScope } from './resolve-business-scope';

/** El CSV de Turnos de un Negocio, según el rol de quien lo pide. */
@Injectable()
export class ExportBusinessBookingsCsvUseCase {
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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Una fila por Turno del Negocio con `startsAt` en el rango, con el mismo alcance y los mismos permisos que
   * `GetBusinessAnalyticsUseCase`: el Dueño recibe todo el Negocio, un Empleado que no lo es solo sus Turnos.
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
  ): Promise<string> {
    const { range } = parseAnalyticsRange(from, to);
    const { scope } = await resolveBusinessScope(
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
    return bookingsCsv(
      await this.analytics.bookingRows(
        scope,
        range,
        this.clock.now(),
        filters.serviceId,
      ),
    );
  }
}
