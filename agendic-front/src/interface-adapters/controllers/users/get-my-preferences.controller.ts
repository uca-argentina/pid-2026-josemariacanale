import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import { preferencesSchema } from '@/src/entities/models/user';

export type IGetMyPreferencesController = ReturnType<typeof getMyPreferencesController>;
/**
 * The Usuario's hour format and first day of the week.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {ApiRequestError} the back failed
 */
export const getMyPreferencesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getMeUseCase: IGetMeUseCase,
    ) =>
    async () =>
        instrumentationService.startSpan({ name: 'getMyPreferences Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return preferencesSchema.parse(await getMeUseCase());
        });
