import { getEmployeesPerPeriodController } from '@/src/interface-adapters/controllers/analytics/get-employees-per-period.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const input = { businessId: 4, from: '2026-09-13', to: '2026-10-12', granularity: 'week' };

describe('getEmployeesPerPeriodController', () => {
    it('labels the buckets like the chart and keeps the counts', async () => {
        const get = jest.fn().mockResolvedValue({
            buckets: ['2026-10-05', '2026-10-12'],
            rows: [{ employeeId: 5, name: 'Bruno', imageUrl: 'https://img/b.png', counts: [0, 3] }],
        });

        const result = await getEmployeesPerPeriodController(instrumentation, signedIn, get)(input);

        expect(get).toHaveBeenCalledWith(input);
        expect(result).toEqual({
            labels: ['5 oct', '12 oct'],
            rows: [{ id: 5, name: 'Bruno', imageUrl: 'https://img/b.png', counts: [0, 3] }],
        });
    });

    it('labels months with the year', async () => {
        const get = jest.fn().mockResolvedValue({ buckets: ['2026-10-01'], rows: [] });
        const result = await getEmployeesPerPeriodController(instrumentation, signedIn, get)({ ...input, granularity: 'month' });
        expect(result.labels).toEqual(['oct 2026']);
    });

    it.each([
        ['a missing granularity', { ...input, granularity: undefined }],
        ['an unknown granularity', { ...input, granularity: 'year' }],
        ['a bad range', { ...input, from: 'x' }],
    ])('rejects %s without calling the use case', async (_name, bad) => {
        const get = jest.fn();
        await expect(getEmployeesPerPeriodController(instrumentation, signedIn, get)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(get).not.toHaveBeenCalled();
    });

    it('requires a Sesión', async () => {
        const get = jest.fn();
        const noSession = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(getEmployeesPerPeriodController(instrumentation, noSession, get)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});
