import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CatalogService, ServiceEmployeeRef } from '@/src/entities/models/service';

export type IAssignEmployeeUseCase = ReturnType<typeof assignEmployeeUseCase>;
/**
 * Ofrecer un Servicio, with the Empleado's default Availability. The back accepts it from the Dueño for any Empleado,
 * or from the Empleado for themselves (403 otherwise); the front does not duplicate it.
 *
 * @throws {EmployeeNotAssignableError} the Empleado is not of the Negocio or was dado de baja
 * @throws {NotFoundError} the Servicio or the Empleado do not exist
 * @throws {ApiRequestError} not allowed, already offered, or the back failed
 */
export const assignEmployeeUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: ServiceEmployeeRef): Promise<CatalogService> =>
        instrumentationService.startSpan({ name: 'assignEmployee Use Case', op: 'function' }, () =>
            servicesRepository.assignEmployee(input),
        );
