import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { AuthenticationService } from '@/src/infrastructure/services/authentication.service';
import { getCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';

export function createAuthModule() {
    const authModule = createModule();

    authModule.bind(DI_SYMBOLS.IAuthenticationService).toClass(AuthenticationService);

    authModule
        .bind(DI_SYMBOLS.IGetCurrentUserController)
        .toHigherOrderFunction(getCurrentUserController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
        ]);

    return authModule;
}
