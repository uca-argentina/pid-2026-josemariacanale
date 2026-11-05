import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListUnseenBadgesUseCase } from '@/src/application/use-cases/badges/list-unseen-badges.use-case';
import type { UnseenBadge } from '@/src/entities/models/badge';

function presenter(badges: UnseenBadge[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listUnseenBadges Presenter', op: 'serialize' }, () =>
        badges.map(({ badge, name, level, earnedAt }) => ({ badge, name, level, earnedAt })),
    );
}

export type IListUnseenBadgesController = ReturnType<typeof listUnseenBadgesController>;
/**
 * Los Niveles que el Usuario de la Sesión ganó y todavía no vio, para celebrarlos al abrir la app.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {ApiRequestError} el back falló
 */
export const listUnseenBadgesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listUnseenBadgesUseCase: IListUnseenBadgesUseCase,
    ) =>
    async () =>
        instrumentationService.startSpan({ name: 'listUnseenBadges Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listUnseenBadgesUseCase(), instrumentationService);
        });
