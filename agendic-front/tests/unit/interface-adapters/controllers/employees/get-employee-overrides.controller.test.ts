import { getEmployeeOverridesController } from '@/src/interface-adapters/controllers/employees/get-employee-overrides.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError, InputParseError } from '@/src/entities/errors/common';

describe('getEmployeeOverrides Controller', () => {
    it('returns overrides for authenticated user', async () => {
        const getEmployeeOverridesUseCase = jest.fn().mockResolvedValue([
            { date: '2026-10-10', intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        ]);

        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            getEmployeeOverridesUseCase,
        );

        const result = await controller({ employeeId: 1 }, 'session-id');

        expect(getEmployeeOverridesUseCase).toHaveBeenCalledWith({ employeeId: 1 });
        expect(result).toEqual([{ date: '2026-10-10', intervals: [{ startTime: '09:00', endTime: '18:00' }], coveredByEmployeeId: undefined }]);
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({}),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1 }, undefined)).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            jest.fn(),
        );
        await expect(controller({}, 'session-id')).rejects.toThrow(InputParseError);
    });
});
