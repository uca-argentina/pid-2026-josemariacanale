import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { getMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import { getUserPageUseCase } from '@/src/application/use-cases/users/get-user-page.use-case';
import { retireMeUseCase } from '@/src/application/use-cases/users/retire-me.use-case';
import { updateMySlugUseCase } from '@/src/application/use-cases/users/update-my-slug.use-case';
import { UsersRepository } from '@/src/infrastructure/repositories/users.repository';
import { getUserPageController } from '@/src/interface-adapters/controllers/users/get-user-page.controller';
import { retireMeController } from '@/src/interface-adapters/controllers/users/retire-me.controller';
import { updateMySlugController } from '@/src/interface-adapters/controllers/users/update-my-slug.controller';

/** The Usuario as the back knows them, and their Enlace de reserva (ADR 0021). */
export function createUsersModule() {
    const usersModule = createModule();

    usersModule.bind(DI_SYMBOLS.IUsersRepository).toClass(UsersRepository, [DI_SYMBOLS.IAuthenticationService]);

    usersModule
        .bind(DI_SYMBOLS.IGetMeUseCase)
        .toHigherOrderFunction(getMeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUsersRepository]);

    usersModule
        .bind(DI_SYMBOLS.IUpdateMySlugUseCase)
        .toHigherOrderFunction(updateMySlugUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUsersRepository]);

    usersModule
        .bind(DI_SYMBOLS.IGetUserPageUseCase)
        .toHigherOrderFunction(getUserPageUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUsersRepository]);

    usersModule
        .bind(DI_SYMBOLS.IUpdateMySlugController)
        .toHigherOrderFunction(updateMySlugController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateMySlugUseCase,
        ]);

    usersModule
        .bind(DI_SYMBOLS.IRetireMeUseCase)
        .toHigherOrderFunction(retireMeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUsersRepository]);

    usersModule
        .bind(DI_SYMBOLS.IRetireMeController)
        .toHigherOrderFunction(retireMeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRetireMeUseCase,
        ]);

    usersModule
        .bind(DI_SYMBOLS.IGetUserPageController)
        .toHigherOrderFunction(getUserPageController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetUserPageUseCase]);

    return usersModule;
}
