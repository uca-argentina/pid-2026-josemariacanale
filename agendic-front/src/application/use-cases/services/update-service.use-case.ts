import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CatalogService, PersonalService, UpdateService } from '@/src/entities/models/service';

export type IUpdateServiceUseCase = ReturnType<typeof updateServiceUseCase>;
/**
 * Changes the fields sent of a Servicio, del Negocio or personal. "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
 *
 * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal
 * @throws {ServiceNameTakenError} the name is taken in that Sucursal
 * @throws {NotFoundError} the Servicio does not exist
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const updateServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: UpdateService): Promise<CatalogService | PersonalService> =>
        instrumentationService.startSpan({ name: 'updateService Use Case', op: 'function' }, () =>
            servicesRepository.updateService(input),
        );
