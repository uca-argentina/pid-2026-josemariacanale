import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createServiceSchema, type CatalogService } from '@/src/entities/models/service';

/** Only what the panel needs to confirm the alta: the page reloads the catalog afterwards. */
function presenter(service: CatalogService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createService Presenter', op: 'serialize' }, () => ({
        id: service.id,
        name: service.name,
        slug: service.slug,
    }));
}

export type ICreateServiceController = ReturnType<typeof createServiceController>;
/**
 * Nuevo or Duplicar of the panel: creates a Servicio in one Sucursal of the Usuario's Negocio.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the data does not have the shape POST /branches/:id/services expects
 * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal
 * @throws {ServiceNameTakenError} the name is taken in that Sucursal
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const createServiceController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createServiceUseCase: ICreateServiceUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = createServiceSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createServiceUseCase(data), instrumentationService);
        });
