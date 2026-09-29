import { putEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/put-employee-override.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';

const mockUser = { id: 'u1', email: 'u1@test.com', name: 'User 1' };

describe('putEmployeeOverride Controller', () => {
    it('puts override', async () => {
        const putEmployeeOverrideUseCase = jest.fn().mockResolvedValue(undefined);

        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(mockUser) }),
            putEmployeeOverrideUseCase,
        );

        await controller({
            employeeId: 1,
            date: '2026-10-10',
            override: { intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        });

        expect(putEmployeeOverrideUseCase).toHaveBeenCalledWith({
            employeeId: 1,
            date: '2026-10-10',
            override: { intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        });
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) }),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1, date: '2026-10-10', override: { intervals: [] } })).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = putEmployeeOverrideController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue(mockUser) }),
            jest.fn(),
        );
        await expect(controller({})).rejects.toThrow(InputParseError);
    });
});
