import { assignEmployeeUseCase } from '@/src/application/use-cases/services/assign-employee.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { EmployeeNotAssignableError } from '@/src/entities/errors/service';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = { serviceId: 100, employeeId: 2 };

describe('assignEmployeeUseCase', () => {
    it('makes the Empleado offer the Servicio and returns the Servicio', async () => {
        const service = { id: 100, name: 'Masaje' };
        const repo = servicesWith({ assignEmployee: jest.fn().mockResolvedValue(service) });

        await expect(assignEmployeeUseCase(instrumentation, repo)(input)).resolves.toBe(service);
        expect(repo.assignEmployee).toHaveBeenCalledWith(input);
    });

    it('propagates the 422 of an Empleado who is not of the Negocio', async () => {
        const repo = servicesWith({ assignEmployee: jest.fn().mockRejectedValue(new EmployeeNotAssignableError('no')) });

        await expect(assignEmployeeUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(EmployeeNotAssignableError);
    });

    it('propagates the 404 of a Servicio that does not exist', async () => {
        const repo = servicesWith({ assignEmployee: jest.fn().mockRejectedValue(new NotFoundError('gone')) });

        await expect(assignEmployeeUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates the 403 of acting for another Empleado without being the Dueño', async () => {
        const repo = servicesWith({ assignEmployee: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })) });

        await expect(assignEmployeeUseCase(instrumentation, repo)(input)).rejects.toMatchObject({ status: 403 });
    });
});
