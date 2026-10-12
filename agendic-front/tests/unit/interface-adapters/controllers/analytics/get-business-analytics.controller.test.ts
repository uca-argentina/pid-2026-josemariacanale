import { getBusinessAnalyticsController } from '@/src/interface-adapters/controllers/analytics/get-business-analytics.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const none = { current: 0, previous: 0 };
const kpis = Object.fromEntries(
    ['booked', 'attended', 'rescheduled', 'cancelled', 'rejected', 'pending', 'noShows', 'employeeNoShows', 'averageRating', 'csat', 'revenue'].map((n) => [n, none]),
);
const employeeView = {
    kpis,
    granularity: 'day' as const,
    trend: [],
    popularServices: [{ serviceId: 3, name: 'Corte', count: 9 }],
    recentRatings: [
        { score: 5, comment: null, createdAt: '2026-10-12T15:00:00.000Z', clientName: 'Ana', serviceName: 'Corte', employeeName: 'Bruno' },
    ],
    filterOptions: { branches: [{ id: 1, name: 'Centro' }], services: [{ id: 3, name: 'Corte' }] },
};
const ranked = [{ employeeId: 5, name: 'Bruno', imageUrl: 'https://img/b.png', count: 1234 }];
const ownerView = {
    ...employeeView,
    filterOptions: { ...employeeView.filterOptions, employees: [{ id: 5, name: 'Bruno' }] },
    mostBookedEmployees: ranked,
    leastBookedEmployees: [{ employeeId: 6, name: 'Carla', imageUrl: null, count: 2 }],
    mostCancelledEmployees: [],
};
const input = { businessId: 4, from: '2026-09-13', to: '2026-10-12' };

describe('getBusinessAnalyticsController', () => {
    it('for the Dueño: shares the personal blocks and adds the Empleado rankings and filters', async () => {
        const get = jest.fn().mockResolvedValue(ownerView);

        const result = await getBusinessAnalyticsController(instrumentation, signedIn, get)(input);

        expect(get).toHaveBeenCalledWith(input);
        expect(result.cards).toHaveLength(11);
        expect(result.popularServices).toEqual([{ id: 3, name: 'Corte', count: '9' }]);
        expect(result.recentRatings[0]).toMatchObject({ clientName: 'Ana', employeeName: 'Bruno' });
        expect(result.branches).toEqual([{ id: 1, name: 'Centro' }]);
        expect(result.employees).toEqual([{ id: 5, name: 'Bruno' }]);
        expect(result.rankings).toEqual({
            mostBooked: [{ id: 5, name: 'Bruno', imageUrl: 'https://img/b.png', count: '1.234' }],
            leastBooked: [{ id: 6, name: 'Carla', imageUrl: null, count: '2' }],
            mostCancelled: [],
        });
    });

    it('for an Empleado: no rankings and no Empleado filter', async () => {
        const get = jest.fn().mockResolvedValue(employeeView);

        const result = await getBusinessAnalyticsController(instrumentation, signedIn, get)(input);

        expect(result.rankings).toBeNull();
        expect(result.employees).toBeNull();
        expect(result.services).toEqual(employeeView.filterOptions.services);
    });

    it.each([
        ['a missing businessId', { from: input.from, to: input.to }],
        ['a bad range', { ...input, from: 'x' }],
        ['a non-positive branchId', { ...input, branchId: 0 }],
    ])('rejects %s without calling the use case', async (_name, bad) => {
        const get = jest.fn();
        await expect(getBusinessAnalyticsController(instrumentation, signedIn, get)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(get).not.toHaveBeenCalled();
    });

    it('requires a Sesión', async () => {
        const get = jest.fn();
        const noSession = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(getBusinessAnalyticsController(instrumentation, noSession, get)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});
