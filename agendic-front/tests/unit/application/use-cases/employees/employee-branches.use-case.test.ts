import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { changeEmployeeBranchesUseCase } from '@/src/application/use-cases/employees/change-employee-branches.use-case';
import { previewEmployeeBranchesUseCase } from '@/src/application/use-cases/employees/preview-employee-branches.use-case';
import { EmployeeBranchesBookingsChangedError, OwnerWorksAtEveryBranchError } from '@/src/entities/errors/employee';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 40,
    startsAt: '2026-11-10T13:00:00.000Z',
    endsAt: '2026-11-10T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    branch: { id: 2, name: 'Palermo' },
};

const repoWith = (stubs: Partial<IEmployeesRepository>) => stubs as IEmployeesRepository;

describe('previewEmployeeBranchesUseCase', () => {
    it('returns the Turnos that changing the Sucursales would cancel', async () => {
        const previewEmployeeBranches = jest.fn().mockResolvedValue([booking]);

        await expect(previewEmployeeBranchesUseCase(instrumentation, repoWith({ previewEmployeeBranches }))({ employeeId: 3, branchIds: [1] })).resolves.toEqual([
            booking,
        ]);
        expect(previewEmployeeBranches).toHaveBeenCalledWith({ employeeId: 3, branchIds: [1] });
    });

    it('lets the 422 of the Dueño through', async () => {
        const previewEmployeeBranches = jest.fn().mockRejectedValue(new OwnerWorksAtEveryBranchError('The Dueño works at every Branch'));

        await expect(
            previewEmployeeBranchesUseCase(instrumentation, repoWith({ previewEmployeeBranches }))({ employeeId: 3, branchIds: [1] }),
        ).rejects.toBeInstanceOf(OwnerWorksAtEveryBranchError);
    });
});

describe('changeEmployeeBranchesUseCase', () => {
    it('saves the Sucursales with the confirmed Turnos and returns how many were cancelled', async () => {
        const changeEmployeeBranches = jest.fn().mockResolvedValue({ cancelledBookings: 1 });
        const input = { employeeId: 3, branchIds: [1], cancelBookingIds: [40] };

        await expect(changeEmployeeBranchesUseCase(instrumentation, repoWith({ changeEmployeeBranches }))(input)).resolves.toEqual({ cancelledBookings: 1 });
        expect(changeEmployeeBranches).toHaveBeenCalledWith(input);
    });

    it('lets the 409 of Turnos that changed through', async () => {
        const changeEmployeeBranches = jest.fn().mockRejectedValue(new EmployeeBranchesBookingsChangedError('Los Turnos que se cancelan cambiaron'));

        await expect(
            changeEmployeeBranchesUseCase(instrumentation, repoWith({ changeEmployeeBranches }))({ employeeId: 3, branchIds: [1] }),
        ).rejects.toBeInstanceOf(EmployeeBranchesBookingsChangedError);
    });
});
