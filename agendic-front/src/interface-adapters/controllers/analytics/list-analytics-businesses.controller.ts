import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListAnalyticsBusinessesUseCase } from '@/src/application/use-cases/analytics/list-analytics-businesses.use-case';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';

function presenter(businesses: AnalyticsBusiness[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listAnalyticsBusinesses Presenter', op: 'serialize' }, () =>
        businesses.map(({ id, name, isOwner }) => ({ id, name, isOwner })),
    );
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListAnalyticsBusinessesController = ReturnType<typeof listAnalyticsBusinessesController>;

/**
 * Los Negocios que el selector de Analíticas ofrece al Usuario con Sesión; vacío si no es Empleado de ninguno.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listAnalyticsBusinessesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listAnalyticsBusinessesUseCase: IListAnalyticsBusinessesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listAnalyticsBusinesses Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listAnalyticsBusinessesUseCase(), instrumentationService);
        });
