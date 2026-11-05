import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listMyBadgesUseCase } from '@/src/application/use-cases/badges/list-my-badges.use-case';
import { listUnseenBadgesUseCase } from '@/src/application/use-cases/badges/list-unseen-badges.use-case';
import { markBadgesSeenUseCase } from '@/src/application/use-cases/badges/mark-badges-seen.use-case';
import { listUnseenBadgesController } from '@/src/interface-adapters/controllers/badges/list-unseen-badges.controller';
import { markBadgesSeenController } from '@/src/interface-adapters/controllers/badges/mark-badges-seen.controller';
import { BadgesRepository } from '@/src/infrastructure/repositories/badges.repository';
import { listMyBadgesController } from '@/src/interface-adapters/controllers/badges/list-my-badges.controller';

/** Insignias del Usuario: su catálogo, Niveles y progreso. */
export function createBadgesModule() {
    const badgesModule = createModule();

    badgesModule
        .bind(DI_SYMBOLS.IBadgesRepository)
        .toClass(BadgesRepository, [DI_SYMBOLS.IAuthenticationService, DI_SYMBOLS.IInstrumentationService]);

    badgesModule
        .bind(DI_SYMBOLS.IListMyBadgesUseCase)
        .toHigherOrderFunction(listMyBadgesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBadgesRepository]);

    badgesModule
        .bind(DI_SYMBOLS.IListMyBadgesController)
        .toHigherOrderFunction(listMyBadgesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListMyBadgesUseCase,
        ]);

    badgesModule
        .bind(DI_SYMBOLS.IListUnseenBadgesUseCase)
        .toHigherOrderFunction(listUnseenBadgesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBadgesRepository]);

    badgesModule
        .bind(DI_SYMBOLS.IMarkBadgesSeenUseCase)
        .toHigherOrderFunction(markBadgesSeenUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBadgesRepository]);

    badgesModule
        .bind(DI_SYMBOLS.IListUnseenBadgesController)
        .toHigherOrderFunction(listUnseenBadgesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListUnseenBadgesUseCase,
        ]);

    badgesModule
        .bind(DI_SYMBOLS.IMarkBadgesSeenController)
        .toHigherOrderFunction(markBadgesSeenController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IMarkBadgesSeenUseCase,
        ]);

    return badgesModule;
}
