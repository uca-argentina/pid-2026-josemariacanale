import type {
    AnalyticsBusiness,
    AnalyticsQuery,
    BusinessAnalytics,
    BusinessAnalyticsQuery,
    EmployeesPerPeriod,
    EmployeesPerPeriodQuery,
    PersonalAnalytics,
} from '@/src/entities/models/analytics';

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

    /**
     * Los Negocios de los que es Empleado, el propio primero; vacío si no es Empleado de ninguno.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listAnalyticsBusinesses(): Promise<AnalyticsBusiness[]>;

    /**
     * Los KPI y bloques de un Negocio en el período, con los filtros que lleve la consulta.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {InputParseError} el rango no es válido (400)
     * @throws {UnauthorizedError} no es Empleado del Negocio, o filtra por Empleado sin ser el Dueño (403)
     * @throws {NotFoundError} el Negocio, la Sucursal, el Servicio o el Empleado no existen (404)
     */
    getBusinessAnalytics(query: BusinessAnalyticsQuery): Promise<BusinessAnalytics>;

    /**
     * Los Turnos de cada Empleado del Negocio por bucket del período (solo el Dueño).
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {InputParseError} el rango o la agrupación no son válidos (400)
     * @throws {UnauthorizedError} no es el Dueño del Negocio (403)
     * @throws {NotFoundError} el Negocio, la Sucursal o el Servicio no existen (404)
     */
    getEmployeesPerPeriod(query: EmployeesPerPeriodQuery): Promise<EmployeesPerPeriod>;
}
