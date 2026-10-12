import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetPersonalAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-personal-analytics.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { analyticsQuerySchema, type PersonalAnalytics } from '@/src/entities/models/analytics';
import { presentSharedAnalytics } from '@/src/interface-adapters/presenters/analytics.presenter';

function presenter(analytics: PersonalAnalytics, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getPersonalAnalytics Presenter', op: 'serialize' }, () => ({
        ...presentSharedAnalytics(analytics),
        services: analytics.filterOptions.services,
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetPersonalAnalyticsController = ReturnType<typeof getPersonalAnalyticsController>;

/**
 * Las tarjetas de KPI de los Servicios personales del Usuario con Sesión en un rango de días.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango o el Servicio no son válidos
 * @throws {NotFoundError} el Servicio no es un Servicio personal del Usuario
 */
export const getPersonalAnalyticsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getPersonalAnalyticsUseCase: IGetPersonalAnalyticsUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPersonalAnalytics Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = analyticsQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid analytics range', { cause: error });
            return presenter(await getPersonalAnalyticsUseCase(data), instrumentationService);
        });
