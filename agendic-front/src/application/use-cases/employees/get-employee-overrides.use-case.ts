import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { EmployeeOverride } from '@/src/entities/models/employee-override';

export type IGetEmployeeOverridesUseCase = ReturnType<typeof getEmployeeOverridesUseCase>;

export const getEmployeeOverridesUseCase =
    (
        instrumentationService: IInstrumentationService,
        employeesRepository: IEmployeesRepository,
    ) =>
    async (input: { employeeId: number }): Promise<EmployeeOverride[]> =>
        instrumentationService.startSpan({ name: 'getEmployeeOverrides Use Case', op: 'function' }, async () => {
            return await employeesRepository.getOverrides(input.employeeId);
        });
