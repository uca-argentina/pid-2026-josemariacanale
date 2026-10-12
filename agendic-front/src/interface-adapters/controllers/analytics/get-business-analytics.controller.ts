import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBusinessAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-business-analytics.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { businessAnalyticsQuerySchema, type BusinessAnalytics } from '@/src/entities/models/analytics';
import { count, presentSharedAnalytics } from '@/src/interface-adapters/presenters/analytics.presenter';

const ranking = (employees: NonNullable<BusinessAnalytics['mostBookedEmployees']>) =>
    employees.map(({ employeeId, name, imageUrl, count: n }) => ({ id: employeeId, name, imageUrl, count: count(n) }));

function presenter(analytics: BusinessAnalytics, instrumentationService: IInstrumentationService) {
    const { filterOptions, mostBookedEmployees, leastBookedEmployees, mostCancelledEmployees } = analytics;
    return instrumentationService.startSpan({ name: 'getBusinessAnalytics Presenter', op: 'serialize' }, () => ({
        ...presentSharedAnalytics(analytics),
        branches: filterOptions.branches,
        services: filterOptions.services,
        employees: filterOptions.employees ?? null,
        // El back manda los tres rankings juntos y solo al Dueño.
        rankings:
            mostBookedEmployees && leastBookedEmployees && mostCancelledEmployees
                ? {
                      mostBooked: ranking(mostBookedEmployees),
                      leastBooked: ranking(leastBookedEmployees),
                      mostCancelled: ranking(mostCancelledEmployees),
                  }
                : null,
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetBusinessAnalyticsController = ReturnType<typeof getBusinessAnalyticsController>;

/**
 * Las analíticas de un Negocio para el Empleado con Sesión, con los rankings de Empleados si es el Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el Negocio, el rango o un filtro no son válidos
 * @throws {UnauthorizedError} no es Empleado del Negocio, o filtra por Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio, la Sucursal, el Servicio o el Empleado no existen
 */
export const getBusinessAnalyticsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getBusinessAnalyticsUseCase: IGetBusinessAnalyticsUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getBusinessAnalytics Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = businessAnalyticsQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid business analytics query', { cause: error });
            return presenter(await getBusinessAnalyticsUseCase(data), instrumentationService);
        });
