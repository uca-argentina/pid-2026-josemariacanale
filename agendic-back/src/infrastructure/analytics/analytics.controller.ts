import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetBusinessAnalyticsUseCase } from '../../application/analytics/get-business-analytics.use-case';
import { GetEmployeesPerPeriodUseCase } from '../../application/analytics/get-employees-per-period.use-case';
import { GetPersonalAnalyticsUseCase } from '../../application/analytics/get-personal-analytics.use-case';
import { ListAnalyticsBusinessesUseCase } from '../../application/analytics/list-analytics-businesses.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';

const optionalInt = new ParseIntPipe({ optional: true });

/** Analíticas personales y de los Negocios del Usuario de la Sesión. */
@Controller('analytics')
@UseGuards(ClerkGuard)
export class AnalyticsController {
  constructor(
    private readonly getPersonalAnalyticsUseCase: GetPersonalAnalyticsUseCase,
    private readonly getBusinessAnalyticsUseCase: GetBusinessAnalyticsUseCase,
    private readonly listAnalyticsBusinessesUseCase: ListAnalyticsBusinessesUseCase,
    private readonly getEmployeesPerPeriodUseCase: GetEmployeesPerPeriodUseCase,
  ) {}

  /** KPIs de los Servicios personales del Usuario en `from`..`to` (YYYY-MM-DD), con el período anterior. */
  @Get('personal')
  personal(
    @CurrentUser() userId: number,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('serviceId', optionalInt) serviceId?: number,
  ) {
    return this.getPersonalAnalyticsUseCase.execute(
      userId,
      from,
      to,
      serviceId,
    );
  }

  /** Los Negocios donde el Usuario es Empleado vigente, el suyo primero. */
  @Get('businesses')
  businesses(@CurrentUser() userId: number) {
    return this.listAnalyticsBusinessesUseCase.execute(userId);
  }

  /** Analíticas del Negocio en `from`..`to`, con los filtros opcionales de Sucursal, Servicio y Empleado. */
  @Get('businesses/:businessId')
  business(
    @CurrentUser() userId: number,
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId', optionalInt) branchId?: number,
    @Query('serviceId', optionalInt) serviceId?: number,
    @Query('employeeId', optionalInt) employeeId?: number,
  ) {
    return this.getBusinessAnalyticsUseCase.execute(
      userId,
      businessId,
      from,
      to,
      { branchId, serviceId, employeeId },
    );
  }

  /** Turnos por Empleado y período del Negocio, solo para el Dueño; `granularity` es `day`, `week` o `month`. */
  @Get('businesses/:businessId/employees-per-period')
  employeesPerPeriod(
    @CurrentUser() userId: number,
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('granularity') granularity: string | undefined,
    @Query('branchId', optionalInt) branchId?: number,
    @Query('serviceId', optionalInt) serviceId?: number,
  ) {
    return this.getEmployeesPerPeriodUseCase.execute(
      userId,
      businessId,
      from,
      to,
      granularity,
      { branchId, serviceId },
    );
  }
}
