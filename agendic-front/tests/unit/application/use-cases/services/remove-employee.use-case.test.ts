import { removeEmployeeUseCase } from '@/src/application/use-cases/services/remove-employee.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { LastEmployeeError } from '@/src/entities/errors/employee';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = { serviceId: 100, employeeId: 2 };

describe('removeEmployeeUseCase', () => {
    it('makes the Empleado stop offering the Servicio and returns how many Turnos got cancelled', async () => {
        const repo = servicesWith({ removeEmployee: jest.fn().mockResolvedValue({ cancelledBookings: 2 }) });

        await expect(removeEmployeeUseCase(instrumentation, repo)(input)).resolves.toEqual({ cancelledBookings: 2 });
        expect(repo.removeEmployee).toHaveBeenCalledWith(input);
    });

    it('propagates the 422 of the last Empleado of the Servicio', async () => {
        const repo = servicesWith({ removeEmployee: jest.fn().mockRejectedValue(new LastEmployeeError('last')) });

        await expect(removeEmployeeUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(LastEmployeeError);
    });

    it('propagates the 404 of a Servicio that does not exist', async () => {
        const repo = servicesWith({ removeEmployee: jest.fn().mockRejectedValue(new NotFoundError('gone')) });

        await expect(removeEmployeeUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates the 403 of acting for another Empleado without being the Dueño', async () => {
        const repo = servicesWith({ removeEmployee: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })) });

        await expect(removeEmployeeUseCase(instrumentation, repo)(input)).rejects.toMatchObject({ status: 403 });
    });
});
