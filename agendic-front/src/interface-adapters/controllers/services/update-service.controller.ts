import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateServiceUseCase } from '@/src/application/use-cases/services/update-service.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateServiceSchema, type CatalogService } from '@/src/entities/models/service';

/** Only what the panel needs to confirm the change: the page reloads the catalog afterwards. */
function presenter(service: CatalogService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateService Presenter', op: 'serialize' }, () => ({
        id: service.id,
        name: service.name,
        slug: service.slug,
        hidden: service.hidden,
    }));
}

export type IUpdateServiceController = ReturnType<typeof updateServiceController>;
/**
 * Guardar of the detail, and the switch that hides or shows a Servicio: changes only the fields sent.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the data does not have the shape PATCH /services/:id expects
 * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal
 * @throws {ServiceNameTakenError} the name is taken in that Sucursal
 * @throws {NotFoundError} the Servicio does not exist
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const updateServiceController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateServiceUseCase: IUpdateServiceUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = updateServiceSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateServiceUseCase(data), instrumentationService);
        });
