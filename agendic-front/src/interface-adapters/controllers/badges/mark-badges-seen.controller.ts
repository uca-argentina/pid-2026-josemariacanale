import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMarkBadgesSeenUseCase } from '@/src/application/use-cases/badges/mark-badges-seen.use-case';

export type IMarkBadgesSeenController = ReturnType<typeof markBadgesSeenController>;
/**
 * El Usuario de la Sesión cerró la celebración de sus Niveles nuevos: se marcan todos como vistos.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {ApiRequestError} el back falló
 */
export const markBadgesSeenController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        markBadgesSeenUseCase: IMarkBadgesSeenUseCase,
    ) =>
    async (): Promise<void> =>
        instrumentationService.startSpan({ name: 'markBadgesSeen Controller' }, async () => {
            await authenticationService.getCurrentUser();
            await markBadgesSeenUseCase();
        });
