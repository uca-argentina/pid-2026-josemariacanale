import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { ServiceInCatalog } from '@/src/entities/models/service';

export type IGetMyServiceUseCase = ReturnType<typeof getMyServiceUseCase>;
/**
 * Finds one Servicio of the Usuario's catalog, with its Negocio and its Sucursal. There is no detail endpoint: the
 * catalog already holds only the Servicios the Usuario may see.
 *
 * @throws {NotFoundError} the Servicio is not in the catalog
 * @throws {ApiRequestError} the back failed
 */
export const getMyServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: { serviceId: number }): Promise<ServiceInCatalog> =>
        instrumentationService.startSpan({ name: 'getMyService Use Case', op: 'function' }, async () => {
            for (const group of await servicesRepository.listMyCatalog()) {
                for (const branch of group.branches) {
                    const service = branch.services.find((s) => s.id === input.serviceId);
                    if (service) return { group, branch, service };
                }
            }
            throw new NotFoundError('Service is not in the catalog');
        });
