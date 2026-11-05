import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { EmployeeStats, EmployeeStatsQuery } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetEmployeeStatsUseCase = ReturnType<typeof getEmployeeStatsUseCase>;

/**
 * Los conteos de un Empleado en un Negocio y un período. No autoriza: el back solo deja pedir otro Empleado al Dueño y su error sale tal cual.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango no es válido
 * @throws {UnauthorizedError} no es Empleado del Negocio, o pide a otro Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio o el Empleado no existen
 */
export const getEmployeeStatsUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (query: EmployeeStatsQuery): Promise<EmployeeStats> =>
        instrumentationService.startSpan({ name: 'getEmployeeStats Use Case', op: 'function' }, async () => {
            const { kpis } = await analyticsRepository.getBusinessAnalytics(query);
            // Un KPI sin datos (`null`) es un Empleado sin Turnos de ese tipo: se cuenta 0.
            return {
                attended: kpis.attended.current ?? 0,
                employeeNoShows: kpis.employeeNoShows.current ?? 0,
                rescheduled: kpis.rescheduled.current ?? 0,
                cancelled: kpis.cancelled.current ?? 0,
            };
        });
