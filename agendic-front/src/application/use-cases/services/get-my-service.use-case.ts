import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { MyService } from '@/src/entities/models/service';

export type IGetMyServiceUseCase = ReturnType<typeof getMyServiceUseCase>;
/**
 * Finds one Servicio of the Usuario: in their catalog, with its Negocio and its Sucursal, or among their Servicios
 * personales. There is no detail endpoint: both lists already hold only the Servicios the Usuario may see.
 *
 * @throws {NotFoundError} the Servicio is neither in the catalog nor among the Servicios personales
 * @throws {ApiRequestError} the back failed
 */
export const getMyServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: { serviceId: number }): Promise<MyService> =>
        instrumentationService.startSpan({ name: 'getMyService Use Case', op: 'function' }, async () => {
            const [catalog, personal] = await Promise.all([
                servicesRepository.listMyCatalog(),
                servicesRepository.listPersonalServices(),
            ]);
            for (const group of catalog) {
                for (const branch of group.branches) {
                    const service = branch.services.find((s) => s.id === input.serviceId);
                    if (service) return { group, branch, service };
                }
            }
            const service = personal.find((s) => s.id === input.serviceId);
            if (service) return { group: null, branch: null, service };
            throw new NotFoundError('Service is not the Usuario’s');
        });
