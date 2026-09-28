import { getEmployeeOverridesUseCase } from '@/src/application/use-cases/employees/get-employee-overrides.use-case';
import { instrumentation } from '@/tests/unit/stubs';

describe('getEmployeeOverrides Use Case', () => {
    it('returns overrides', async () => {
        const overrides = [{ date: '2026-10-10', intervals: [{ startTime: '09:00', endTime: '18:00' }] }];
        const employeesRepository = {
            listEmployees: jest.fn(),
            addEmployee: jest.fn(),
            retireEmployee: jest.fn(),
            getOverrides: jest.fn().mockResolvedValue(overrides),
            putOverride: jest.fn(),
            deleteOverride: jest.fn(),
        };

        const useCase = getEmployeeOverridesUseCase(instrumentation, employeesRepository);

        const result = await useCase({ employeeId: 1 });

        expect(employeesRepository.getOverrides).toHaveBeenCalledWith(1);
        expect(result).toEqual(overrides);
    });
});
