import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListMyBadgesUseCase } from '@/src/application/use-cases/badges/list-my-badges.use-case';
import type { MyBadge } from '@/src/entities/models/badge';

function presenter(badges: MyBadge[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyBadges Presenter', op: 'serialize' }, () =>
        badges.map(({ badge, name, level, progress, levels }) => ({
            badge,
            name,
            level,
            progress: progress && { current: progress.current, target: progress.target },
            levels: levels.map((l) => ({ level: l.level, target: l.target, earnedAt: l.earnedAt })),
        })),
    );
}

export type IListMyBadgesController = ReturnType<typeof listMyBadgesController>;
/**
 * Las Insignias del Usuario de la Sesión: las que tiene en curso y las conseguidas.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {ApiRequestError} el back falló
 */
export const listMyBadgesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyBadgesUseCase: IListMyBadgesUseCase,
    ) =>
    async () =>
        instrumentationService.startSpan({ name: 'listMyBadges Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listMyBadgesUseCase(), instrumentationService);
        });
