import { putEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/put-employee-override.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError, InputParseError } from '@/src/entities/errors/common';

describe('putEmployeeOverride Controller', () => {
    it('puts override', async () => {
        const putEmployeeOverrideUseCase = jest.fn().mockResolvedValue(undefined);

        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            putEmployeeOverrideUseCase,
        );

        await controller({
            employeeId: 1,
            date: '2026-10-10',
            override: { intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        }, 'session-id');

        expect(putEmployeeOverrideUseCase).toHaveBeenCalledWith({
            employeeId: 1,
            date: '2026-10-10',
            override: { intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        });
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({}),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1, date: '2026-10-10', override: { intervals: [] } }, undefined)).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({ validateSession: jest.fn().mockResolvedValue({ session: { userId: 'u1' } }) }),
            jest.fn(),
        );
        await expect(controller({}, 'session-id')).rejects.toThrow(InputParseError);
    });
});
