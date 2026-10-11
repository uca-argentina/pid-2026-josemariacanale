import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateMyPreferencesUseCase } from '@/src/application/use-cases/users/update-my-preferences.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { preferencesSchema, type Me } from '@/src/entities/models/user';

function presenter(me: Me, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateMyPreferences Presenter', op: 'serialize' }, () =>
        preferencesSchema.parse(me),
    );
}

const inputSchema = preferencesSchema.partial();

export type IUpdateMyPreferencesController = ReturnType<typeof updateMyPreferencesController>;
/**
 * The Usuario changes their hour format and/or first day of the week.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} a value is out of range
 * @throws {ApiRequestError} the back failed
 */
export const updateMyPreferencesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateMyPreferencesUseCase: IUpdateMyPreferencesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateMyPreferences Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateMyPreferencesUseCase(data), instrumentationService);
        });
