import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreateEmployee, Employee } from '@/src/entities/models/employee';

export type IAddEmployeeUseCase = ReturnType<typeof addEmployeeUseCase>;
// "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
export const addEmployeeUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (input: CreateEmployee): Promise<Employee> =>
        instrumentationService.startSpan({ name: 'addEmployee Use Case', op: 'function' }, () =>
            employeesRepository.addEmployee(input),
        );
