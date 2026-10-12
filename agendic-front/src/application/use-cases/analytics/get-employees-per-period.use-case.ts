import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { EmployeesPerPeriod, EmployeesPerPeriodQuery } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetEmployeesPerPeriodUseCase = ReturnType<typeof getEmployeesPerPeriodUseCase>;

/**
 * Los Turnos por Empleado y período de un Negocio. No autoriza: el back decide que solo lo ve el Dueño, y sus errores salen tal cual.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango o la agrupación no son válidos
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio, la Sucursal o el Servicio no existen
 */
export const getEmployeesPerPeriodUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (query: EmployeesPerPeriodQuery): Promise<EmployeesPerPeriod> =>
        instrumentationService.startSpan({ name: 'getEmployeesPerPeriod Use Case', op: 'function' }, () =>
            analyticsRepository.getEmployeesPerPeriod(query),
        );
