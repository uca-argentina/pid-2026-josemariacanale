import { getEmployeeStatsController } from '@/src/interface-adapters/controllers/analytics/get-employee-stats.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const input = { businessId: 4, employeeId: 9, from: '2026-10-06', to: '2026-11-04' };

describe('getEmployeeStatsController', () => {
    it('presents the four counts of the Empleado', async () => {
        const get = jest.fn().mockResolvedValue({ attended: 12, employeeNoShows: 1, rescheduled: 3, cancelled: 5 });

        const result = await getEmployeeStatsController(instrumentation, signedIn, get)(input);

        expect(get).toHaveBeenCalledWith(input);
        expect(result).toEqual({ attended: 12, employeeNoShows: 1, rescheduled: 3, cancelled: 5 });
    });

    it.each([
        ['a missing employeeId', { ...input, employeeId: undefined }],
        ['a missing businessId', { ...input, businessId: undefined }],
        ['a bad range', { ...input, from: 'x' }],
    ])('rejects %s without calling the use case', async (_name, bad) => {
        const get = jest.fn();
        await expect(getEmployeeStatsController(instrumentation, signedIn, get)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(get).not.toHaveBeenCalled();
    });

    it('requires a Sesión', async () => {
        const get = jest.fn();
        const noSession = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(getEmployeeStatsController(instrumentation, noSession, get)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});
