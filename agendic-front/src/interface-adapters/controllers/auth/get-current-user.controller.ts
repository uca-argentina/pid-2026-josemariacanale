import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { User } from '@/src/entities/models/user';

function presenter(user: User, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getCurrentUser Presenter', op: 'serialize' }, () => ({
        name: user.name,
        imageUrl: user.imageUrl,
    }));
}

export type IGetCurrentUserController = ReturnType<typeof getCurrentUserController>;
// No use case: the port's getCurrentUser is both the authentication and the lookup.
export const getCurrentUserController =
    (instrumentationService: IInstrumentationService, authenticationService: IAuthenticationService) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getCurrentUser Controller' }, async () =>
            presenter(await authenticationService.getCurrentUser(), instrumentationService),
        );
