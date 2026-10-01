import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CatalogService, CreateService } from '@/src/entities/models/service';

export type ICreateServiceUseCase = ReturnType<typeof createServiceUseCase>;
/**
 * Creates a Servicio in a Sucursal. "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
 *
 * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal
 * @throws {ServiceNameTakenError} the name is taken in that Sucursal
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const createServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: CreateService): Promise<CatalogService> =>
        instrumentationService.startSpan({ name: 'createService Use Case', op: 'function' }, () =>
            servicesRepository.createService(input),
        );
