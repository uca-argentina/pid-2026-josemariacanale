import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { AUTH_OFFLINE } from '@/src/entities/models/offline-session';
import { AuthenticationService } from '@/src/infrastructure/services/authentication.service';
import { OfflineAuthenticationService } from '@/src/infrastructure/services/offline-authentication.service';
import { getCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';

export function createAuthModule() {
    const authModule = createModule();

    authModule.bind(DI_SYMBOLS.IAuthenticationService).toClass(AUTH_OFFLINE ? OfflineAuthenticationService : AuthenticationService);

    authModule
        .bind(DI_SYMBOLS.IGetCurrentUserController)
        .toHigherOrderFunction(getCurrentUserController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
        ]);

    return authModule;
}
