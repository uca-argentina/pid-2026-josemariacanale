import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { retireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import { LastEmployeeError } from '@/src/entities/errors/employee';
import { instrumentation } from '@/tests/unit/stubs';

const repoWith = (retireEmployee: jest.Mock): IEmployeesRepository => ({
    listEmployees: jest.fn(),
    addEmployee: jest.fn(),
    listInvitations: jest.fn(),
    retireEmployee,
    listMyInvitations: jest.fn(),
    acceptInvitation: jest.fn(),
    rejectInvitation: jest.fn(),
});

describe('retireEmployeeUseCase', () => {
    it('retires the Empleado through the repository', async () => {
        const retireEmployee = jest.fn().mockResolvedValue(undefined);

        await retireEmployeeUseCase(instrumentation, repoWith(retireEmployee))(3);
        expect(retireEmployee).toHaveBeenCalledWith(3);
    });

    it('lets LastEmployeeError through', async () => {
        const repo = repoWith(jest.fn().mockRejectedValue(new LastEmployeeError('x')));

        await expect(retireEmployeeUseCase(instrumentation, repo)(3)).rejects.toBeInstanceOf(LastEmployeeError);
    });
});
