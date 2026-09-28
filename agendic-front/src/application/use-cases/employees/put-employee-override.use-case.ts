import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { PutEmployeeOverride } from '@/src/entities/models/employee-override';

export type IPutEmployeeOverrideUseCase = ReturnType<typeof putEmployeeOverrideUseCase>;

export const putEmployeeOverrideUseCase =
    (
        instrumentationService: IInstrumentationService,
        employeesRepository: IEmployeesRepository,
    ) =>
    async (input: { employeeId: number; date: string; override: PutEmployeeOverride }): Promise<void> =>
        instrumentationService.startSpan({ name: 'putEmployeeOverride Use Case', op: 'function' }, async () => {
            return await employeesRepository.putOverride(input.employeeId, input.date, input.override);
        });
