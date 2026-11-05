import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listMyBadgesUseCase } from '@/src/application/use-cases/badges/list-my-badges.use-case';
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

    return badgesModule;
}
