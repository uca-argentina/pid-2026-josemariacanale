import { changeEmployeeAvailabilityUseCase } from '@/src/application/use-cases/services/change-employee-availability.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { AvailabilityNotOfEmployeeError } from '@/src/entities/errors/service';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = { serviceId: 100, employeeId: 2, availabilityId: 9 };

describe('changeEmployeeAvailabilityUseCase', () => {
    it('changes the Availability the Empleado attends the Servicio with and returns the Servicio', async () => {
        const service = { id: 100, name: 'Masaje' };
        const repo = servicesWith({ changeEmployeeAvailability: jest.fn().mockResolvedValue(service) });

        await expect(changeEmployeeAvailabilityUseCase(instrumentation, repo)(input)).resolves.toBe(service);
        expect(repo.changeEmployeeAvailability).toHaveBeenCalledWith(input);
    });

    it('propagates the 422 of an Availability of another Empleado', async () => {
        const repo = servicesWith({
            changeEmployeeAvailability: jest.fn().mockRejectedValue(new AvailabilityNotOfEmployeeError('not theirs')),
        });

        await expect(changeEmployeeAvailabilityUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(
            AvailabilityNotOfEmployeeError,
        );
    });

    it('propagates the 404 of an Empleado who does not attend the Servicio', async () => {
        const repo = servicesWith({ changeEmployeeAvailability: jest.fn().mockRejectedValue(new NotFoundError('no')) });

        await expect(changeEmployeeAvailabilityUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates the 403 of acting for another Empleado without being the Dueño', async () => {
        const repo = servicesWith({
            changeEmployeeAvailability: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })),
        });

        await expect(changeEmployeeAvailabilityUseCase(instrumentation, repo)(input)).rejects.toMatchObject({ status: 403 });
    });
});
