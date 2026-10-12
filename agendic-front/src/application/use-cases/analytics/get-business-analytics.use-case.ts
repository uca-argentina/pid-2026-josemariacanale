import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BusinessAnalytics, BusinessAnalyticsQuery } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetBusinessAnalyticsUseCase = ReturnType<typeof getBusinessAnalyticsUseCase>;

/**
 * Las analíticas de un Negocio. No autoriza: el back decide qué ve cada Empleado y el Dueño, y sus errores salen tal cual.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango no es válido
 * @throws {UnauthorizedError} no es Empleado del Negocio, o filtra por Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio, la Sucursal, el Servicio o el Empleado no existen
 */
export const getBusinessAnalyticsUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (query: BusinessAnalyticsQuery): Promise<BusinessAnalytics> =>
        instrumentationService.startSpan({ name: 'getBusinessAnalytics Use Case', op: 'function' }, () =>
            analyticsRepository.getBusinessAnalytics(query),
        );
