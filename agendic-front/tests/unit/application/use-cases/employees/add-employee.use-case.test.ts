import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { addEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const input = { businessId: 1, name: 'Martina', email: 'martina@estudio.com' };
const repoWith = (addEmployee: jest.Mock): IEmployeesRepository => ({
    listEmployees: jest.fn(),
    addEmployee,
    retireEmployee: jest.fn(),
    getOverrides: jest.fn(),
    putOverride: jest.fn(),
    deleteOverride: jest.fn(),
});

describe('addEmployeeUseCase', () => {
    it('adds the Empleado through the repository', async () => {
        const employee = { id: 3, name: 'Martina', email: 'martina@estudio.com' };
        const addEmployee = jest.fn().mockResolvedValue(employee);

        await expect(addEmployeeUseCase(instrumentation, repoWith(addEmployee))(input)).resolves.toEqual(employee);
        expect(addEmployee).toHaveBeenCalledWith(input);
    });
});
