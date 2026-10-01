import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { listEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const employee = { id: 3, name: 'Martina', email: 'martina@estudio.com' };
const repoWith = (listEmployees: jest.Mock): IEmployeesRepository => ({
    listEmployees,
    addEmployee: jest.fn(),
    retireEmployee: jest.fn(),
    listMyInvitations: jest.fn(),
    acceptInvitation: jest.fn(),
    rejectInvitation: jest.fn(),
    resendInvitation: jest.fn(),
    cancelInvitation: jest.fn(),
    listInvitations: jest.fn(),
});

describe('listEmployeesUseCase', () => {
    it('lists the Empleados of the Negocio through the repository', async () => {
        const listEmployees = jest.fn().mockResolvedValue([employee]);

        await expect(listEmployeesUseCase(instrumentation, repoWith(listEmployees))(1)).resolves.toEqual([employee]);
        expect(listEmployees).toHaveBeenCalledWith(1);
    });
});
