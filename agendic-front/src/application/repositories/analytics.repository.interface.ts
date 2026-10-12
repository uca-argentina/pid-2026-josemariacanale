import type { AnalyticsQuery, PersonalAnalytics } from '@/src/entities/models/analytics';

/** Analíticas del Usuario con Sesión contra la API del back. */
export interface IAnalyticsRepository {
    /**
     * Los KPI de sus Servicios personales en el período y en el anterior.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {InputParseError} el rango no es válido (400)
     * @throws {NotFoundError} el Servicio no es un Servicio personal del Usuario (404)
     */
    getPersonalAnalytics(query: AnalyticsQuery): Promise<PersonalAnalytics>;
}
