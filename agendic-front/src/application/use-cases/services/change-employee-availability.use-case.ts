import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CatalogService, ServiceEmployeeAvailability } from '@/src/entities/models/service';

export type IChangeEmployeeAvailabilityUseCase = ReturnType<typeof changeEmployeeAvailabilityUseCase>;
/**
 * Changes the Availability an Empleado attends a Servicio with. The back accepts it from the Dueño for any Empleado, or
 * from the Empleado for themselves (403 otherwise); the front does not duplicate it.
 *
 * @throws {AvailabilityNotOfEmployeeError} the Availability belongs to another Empleado
 * @throws {NotFoundError} the Empleado does not attend the Servicio
 * @throws {ApiRequestError} not allowed, or the back failed
 */
export const changeEmployeeAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: ServiceEmployeeAvailability): Promise<CatalogService> =>
        instrumentationService.startSpan({ name: 'changeEmployeeAvailability Use Case', op: 'function' }, () =>
            servicesRepository.changeEmployeeAvailability(input),
        );
