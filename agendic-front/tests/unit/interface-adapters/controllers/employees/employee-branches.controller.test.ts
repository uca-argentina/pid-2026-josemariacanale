import { InputParseError } from '@/src/entities/errors/common';
import { changeEmployeeBranchesController } from '@/src/interface-adapters/controllers/employees/change-employee-branches.controller';
import { previewEmployeeBranchesController } from '@/src/interface-adapters/controllers/employees/preview-employee-branches.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 40,
    startsAt: '2026-11-10T13:00:00.000Z',
    endsAt: '2026-11-10T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    branch: { id: 2, name: 'Palermo' },
};
const auth = authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1', email: 'd@x.com' }) });

describe('previewEmployeeBranchesController', () => {
    it('returns the Turnos that changing the Sucursales would cancel', async () => {
        const useCase = jest.fn().mockResolvedValue([booking]);

        await expect(previewEmployeeBranchesController(instrumentation, auth, useCase)({ employeeId: 3, branchIds: [1] })).resolves.toEqual([booking]);
        expect(useCase).toHaveBeenCalledWith({ employeeId: 3, branchIds: [1] });
    });

    it('rejects Sucursales that are not ids with InputParseError', async () => {
        const useCase = jest.fn();

        await expect(previewEmployeeBranchesController(instrumentation, auth, useCase)({ employeeId: 3, branchIds: ['x'] })).rejects.toBeInstanceOf(
            InputParseError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('changeEmployeeBranchesController', () => {
    it('saves with the confirmed Turnos and returns how many were cancelled', async () => {
        const useCase = jest.fn().mockResolvedValue({ cancelledBookings: 2 });
        const input = { employeeId: 3, branchIds: [1], cancelBookingIds: [40, 41] };

        await expect(changeEmployeeBranchesController(instrumentation, auth, useCase)(input)).resolves.toEqual({ cancelledBookings: 2 });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it('rejects Turno ids that are not ids with InputParseError', async () => {
        const useCase = jest.fn();

        await expect(
            changeEmployeeBranchesController(instrumentation, auth, useCase)({ employeeId: 3, branchIds: [1], cancelBookingIds: [-1] }),
        ).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
