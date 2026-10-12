import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListAnalyticsBusinessesUseCase = ReturnType<typeof listAnalyticsBusinessesUseCase>;

/**
 * Los Negocios de los que el Usuario con Sesión es Empleado, el propio primero. No autoriza: el back solo devuelve los suyos.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listAnalyticsBusinessesUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (): Promise<AnalyticsBusiness[]> =>
        instrumentationService.startSpan({ name: 'listAnalyticsBusinesses Use Case', op: 'function' }, () =>
            analyticsRepository.listAnalyticsBusinesses(),
        );
