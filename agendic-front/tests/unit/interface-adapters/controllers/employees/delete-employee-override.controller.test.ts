import { deleteEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/delete-employee-override.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError, InputParseError } from '@/src/entities/errors/common';

describe('deleteEmployeeOverride Controller', () => {
    it('deletes override', async () => {
        const deleteEmployeeOverrideUseCase = jest.fn().mockResolvedValue(undefined);

        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            deleteEmployeeOverrideUseCase,
        );

        await controller({
            employeeId: 1,
            date: '2026-10-10',
        }, 'session-id');

        expect(deleteEmployeeOverrideUseCase).toHaveBeenCalledWith({
            employeeId: 1,
            date: '2026-10-10',
        });
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({}),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1, date: '2026-10-10' }, undefined)).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = deleteEmployeeOverrideController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            jest.fn(),
        );
        await expect(controller({}, 'session-id')).rejects.toThrow(InputParseError);
    });
});
