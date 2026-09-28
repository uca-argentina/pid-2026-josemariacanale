import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';

export type IDeleteEmployeeOverrideUseCase = ReturnType<typeof deleteEmployeeOverrideUseCase>;

export const deleteEmployeeOverrideUseCase =
    (
        instrumentationService: IInstrumentationService,
        employeesRepository: IEmployeesRepository,
    ) =>
    async (input: { employeeId: number; date: string }): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteEmployeeOverride Use Case', op: 'function' }, async () => {
            return await employeesRepository.deleteOverride(input.employeeId, input.date);
        });
