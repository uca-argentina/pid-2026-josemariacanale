import { deleteEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/delete-employee-override.use-case';
import { instrumentation } from '@/tests/unit/stubs';

describe('deleteEmployeeOverride Use Case', () => {
    it('deletes an override', async () => {
        const employeesRepository = {
            listEmployees: jest.fn(),
            addEmployee: jest.fn(),
            retireEmployee: jest.fn(),
            getOverrides: jest.fn(),
            putOverride: jest.fn(),
            deleteOverride: jest.fn().mockResolvedValue(undefined),
        };

        const useCase = deleteEmployeeOverrideUseCase(instrumentation, employeesRepository);

        await useCase({ employeeId: 1, date: '2026-10-10' });

        expect(employeesRepository.deleteOverride).toHaveBeenCalledWith(1, '2026-10-10');
    });
});
