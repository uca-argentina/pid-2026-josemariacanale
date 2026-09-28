import { getEmployeeOverridesController } from '@/src/interface-adapters/controllers/employees/get-employee-overrides.controller';
import { instrumentation, authWith } from '@/tests/unit/stubs';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';

describe('getEmployeeOverrides Controller', () => {
    it('returns overrides for authenticated user', async () => {
        const getEmployeeOverridesUseCase = jest.fn().mockResolvedValue([
            { date: '2026-10-10', intervals: [{ startTime: '09:00', endTime: '18:00' }] },
        ]);

        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1' } as any) }),
            getEmployeeOverridesUseCase,
        );

        const result = await controller({ employeeId: 1 });

        expect(getEmployeeOverridesUseCase).toHaveBeenCalledWith({ employeeId: 1 });
        expect(result).toEqual([{ date: '2026-10-10', intervals: [{ startTime: '09:00', endTime: '18:00' }], coveredByEmployeeId: undefined }]);
    });

    it('throws UnauthenticatedError when unauthenticated', async () => {
        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) }),
            jest.fn(),
        );
        await expect(controller({ employeeId: 1 })).rejects.toThrow(UnauthenticatedError);
    });

    it('throws InputParseError for invalid input', async () => {
        const controller = getEmployeeOverridesController(
            instrumentation,
            authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1' } as any) }),
            jest.fn(),
        );
        await expect(controller({})).rejects.toThrow(InputParseError);
    });
});
