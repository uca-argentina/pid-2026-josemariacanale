import { putEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/put-employee-override.use-case';
import { instrumentation } from '@/tests/unit/stubs';

describe('putEmployeeOverride Use Case', () => {
    it('puts an override', async () => {
        const employeesRepository = {
            listEmployees: jest.fn(),
            addEmployee: jest.fn(),
            retireEmployee: jest.fn(),
            getOverrides: jest.fn(),
            putOverride: jest.fn().mockResolvedValue(undefined),
            deleteOverride: jest.fn(),
        };

        const useCase = putEmployeeOverrideUseCase(instrumentation, employeesRepository);

        await useCase({
            employeeId: 1,
            date: '2026-10-10',
            override: { intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        });

        expect(employeesRepository.putOverride).toHaveBeenCalledWith(1, '2026-10-10', { intervals: [{ startTime: '09:00', endTime: '18:00' }] });
    });
});
