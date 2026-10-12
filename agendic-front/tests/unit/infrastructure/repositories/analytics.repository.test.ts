import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { AnalyticsRepository } from '@/src/infrastructure/repositories/analytics.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const kpi = { current: 1, previous: null };
const body = { kpis: Object.fromEntries(['booked', 'attended', 'rescheduled', 'cancelled', 'rejected', 'pending', 'noShows', 'employeeNoShows', 'averageRating', 'csat', 'revenue'].map((n) => [n, kpi])),
    granularity: 'day',
    trend: [],
    popularServices: [],
    recentRatings: [],
    filterOptions: { services: [] },
};
const query = { from: '2026-09-13', to: '2026-10-12' };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new AnalyticsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, apiUrl);
const respond = (status: number, json: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(json), { status }));

afterEach(() => jest.restoreAllMocks());

describe('AnalyticsRepository.getPersonalAnalytics', () => {
    it('GETs the range with the bearer token and parses the KPIs', async () => {
        const fetchSpy = respond(200, body);

        await expect(repo().getPersonalAnalytics(query)).resolves.toEqual(body);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/analytics/personal?from=2026-09-13&to=2026-10-12',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('sends serviceId when given', async () => {
        const fetchSpy = respond(200, body);
        await repo().getPersonalAnalytics({ ...query, serviceId: 7 });
        expect(fetchSpy.mock.calls[0][0]).toBe('http://api/analytics/personal?from=2026-09-13&to=2026-10-12&serviceId=7');
    });

    it.each([
        [401, UnauthenticatedError],
        [400, InputParseError],
        [404, NotFoundError],
    ])('translates a %i to its domain error', async (status, ErrorClass) => {
        respond(status, { message: 'no' });
        await expect(repo().getPersonalAnalytics(query)).rejects.toBeInstanceOf(ErrorClass);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().getPersonalAnalytics(query)).rejects.toMatchObject({ status: 500 });
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, { kpis: {} });
        const error = await repo().getPersonalAnalytics(query).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});
