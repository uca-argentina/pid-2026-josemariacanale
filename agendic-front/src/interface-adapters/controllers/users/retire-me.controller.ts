import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRetireMeUseCase } from '@/src/application/use-cases/users/retire-me.use-case';

export type IRetireMeController = ReturnType<typeof retireMeController>;
/**
 * El Usuario se da de baja a sí mismo.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {AuthProviderDeletionError} el back no pudo borrarlo en el Proveedor de autenticación; se puede reintentar
 * @throws {ApiRequestError} el back falló
 */
export const retireMeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        retireMeUseCase: IRetireMeUseCase,
    ) =>
    async (): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireMe Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            await retireMeUseCase();
        });
