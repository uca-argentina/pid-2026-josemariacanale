import { deleteEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/delete-employee-override.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';

describe('deleteEmployeeOverride Controller', () => {
    it('deletes override', async () => {
        const deleteEmployeeOverrideUseCase = jest.fn().mockResolvedValue(undefined);

        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1' } as any) }),
            deleteEmployeeOverrideUseCase,
        );

        await controller({
            employeeId: 1,
            date: '2026-10-10',
        });

        expect(deleteEmployeeOverrideUseCase).toHaveBeenCalledWith({
            employeeId: 1,
            date: '2026-10-10',
        });
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) }),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1, date: '2026-10-10' })).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1' } as any) }),
            jest.fn(),
        );
        await expect(controller({})).rejects.toThrow(InputParseError);
    });
});
