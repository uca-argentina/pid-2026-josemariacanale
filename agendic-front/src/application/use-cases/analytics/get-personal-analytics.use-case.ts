import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { AnalyticsQuery, PersonalAnalytics } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetPersonalAnalyticsUseCase = ReturnType<typeof getPersonalAnalyticsUseCase>;

/**
 * Las analíticas de los Servicios personales del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango no es válido
 * @throws {NotFoundError} el Servicio no es un Servicio personal del Usuario
 */
export const getPersonalAnalyticsUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (query: AnalyticsQuery): Promise<PersonalAnalytics> =>
        instrumentationService.startSpan({ name: 'getPersonalAnalytics Use Case', op: 'function' }, () =>
            analyticsRepository.getPersonalAnalytics(query),
        );
