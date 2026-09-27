import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Employee } from '@/src/entities/models/employee';

export type IListEmployeesUseCase = ReturnType<typeof listEmployeesUseCase>;
// "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
export const listEmployeesUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (businessId: number): Promise<Employee[]> =>
        instrumentationService.startSpan({ name: 'listEmployees Use Case', op: 'function' }, () =>
            employeesRepository.listEmployees(businessId),
        );
