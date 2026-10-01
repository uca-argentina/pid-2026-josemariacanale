import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { RemovedEmployee, ServiceEmployeeRef } from '@/src/entities/models/service';

export type IRemoveEmployeeUseCase = ReturnType<typeof removeEmployeeUseCase>;
/**
 * Dejar de ofrecer un Servicio: cancels the Empleado's future Turnos of it. Same permissions as Ofrecer, enforced by
 * the back.
 *
 * @throws {LastEmployeeError} the Empleado is the last one attending it
 * @throws {NotFoundError} the Servicio or the Empleado do not exist
 * @throws {ApiRequestError} not allowed, or the back failed
 */
export const removeEmployeeUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: ServiceEmployeeRef): Promise<RemovedEmployee> =>
        instrumentationService.startSpan({ name: 'removeEmployee Use Case', op: 'function' }, () =>
            servicesRepository.removeEmployee(input),
        );
