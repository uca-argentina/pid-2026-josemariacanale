import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ServiceCatalogGroup } from '@/src/entities/models/service';

export type IListMyServicesUseCase = ReturnType<typeof listMyServicesUseCase>;
/**
 * Lists the Usuario's catalog of Servicios: one group per Negocio where they are an active Empleado.
 *
 * @throws {ApiRequestError} the back failed
 */
export const listMyServicesUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (): Promise<ServiceCatalogGroup[]> =>
        instrumentationService.startSpan({ name: 'listMyServices Use Case', op: 'function' }, () =>
            servicesRepository.listMyCatalog(),
        );
