import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IRetireEmployeeUseCase = ReturnType<typeof retireEmployeeUseCase>;
// "Only the Dueño" and "not the last Empleado of a Servicio" are enforced by the back.
export const retireEmployeeUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (employeeId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireEmployee Use Case', op: 'function' }, () =>
            employeesRepository.retireEmployee(employeeId),
        );
