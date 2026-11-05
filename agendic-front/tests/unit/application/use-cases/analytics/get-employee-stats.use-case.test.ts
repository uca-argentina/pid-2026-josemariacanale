import { getEmployeeStatsUseCase } from '@/src/application/use-cases/analytics/get-employee-stats.use-case';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import type { BusinessAnalytics } from '@/src/entities/models/analytics';
import { instrumentation } from '@/tests/unit/stubs';

const query = { businessId: 4, employeeId: 9, from: '2026-10-06', to: '2026-11-04' };
const kpi = (current: number | null) => ({ current, previous: null });
const analyticsWith = (kpis: Record<string, number | null>) =>
    ({ kpis: Object.fromEntries(Object.entries(kpis).map(([name, value]) => [name, kpi(value)])) }) as unknown as BusinessAnalytics;

describe('getEmployeeStatsUseCase', () => {
    it('asks the back for the Empleado and keeps the four counts', async () => {
        const getBusinessAnalytics = jest.fn().mockResolvedValue(analyticsWith({ attended: 12, employeeNoShows: 1, rescheduled: 3, cancelled: 5, booked: 99 }));

        const result = await getEmployeeStatsUseCase(instrumentation, { getBusinessAnalytics } as never)(query);

        expect(getBusinessAnalytics).toHaveBeenCalledWith(query);
        expect(result).toEqual({ attended: 12, employeeNoShows: 1, rescheduled: 3, cancelled: 5 });
    });

    it('counts a KPI without data as 0', async () => {
        const getBusinessAnalytics = jest.fn().mockResolvedValue(analyticsWith({ attended: null, employeeNoShows: null, rescheduled: null, cancelled: null }));
        const result = await getEmployeeStatsUseCase(instrumentation, { getBusinessAnalytics } as never)(query);
        expect(result).toEqual({ attended: 0, employeeNoShows: 0, rescheduled: 0, cancelled: 0 });
    });

    it('lets the back refusal through', async () => {
        const getBusinessAnalytics = jest.fn().mockRejectedValue(new UnauthorizedError('Only Employees of Business 4 can see its analytics'));
        await expect(getEmployeeStatsUseCase(instrumentation, { getBusinessAnalytics } as never)(query)).rejects.toBeInstanceOf(UnauthorizedError);
    });
});
