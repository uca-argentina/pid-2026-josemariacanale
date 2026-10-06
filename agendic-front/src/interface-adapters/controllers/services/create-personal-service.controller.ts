import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreatePersonalServiceUseCase } from '@/src/application/use-cases/services/create-personal-service.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createPersonalServiceSchema, type PersonalService } from '@/src/entities/models/service';

/** Only what the panel needs to confirm the alta: the page reloads the list afterwards. */
function presenter(service: PersonalService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createPersonalService Presenter', op: 'serialize' }, () => ({
        id: service.id,
        name: service.name,
        slug: service.slug,
    }));
}

export type ICreatePersonalServiceController = ReturnType<typeof createPersonalServiceController>;
/**
 * Nuevo or Duplicar of the Servicios personales: creates one, attended with one of the Usuario's Availability.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the data does not have the shape POST /users/me/services expects
 * @throws {ServiceSlugTakenError} the tramo is taken among the Usuario's Servicios personales
 * @throws {ServiceNameTakenError} the name is taken among the Usuario's Servicios personales
 * @throws {NotFoundError} the Availability is not the Usuario's
 * @throws {ApiRequestError} the back failed
 */
export const createPersonalServiceController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createPersonalServiceUseCase: ICreatePersonalServiceUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createPersonalService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = createPersonalServiceSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createPersonalServiceUseCase(data), instrumentationService);
        });
