import { getPersonalAnalyticsController, variation } from '@/src/interface-adapters/controllers/analytics/get-personal-analytics.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const none = { current: 0, previous: 0 };
const kpis = {
    booked: { current: 12, previous: 10 },
    attended: { current: 8, previous: 8 },
    rescheduled: none,
    cancelled: { current: 3, previous: 2 },
    rejected: none,
    pending: none,
    noShows: { current: 1, previous: 2 },
    employeeNoShows: none,
    averageRating: { current: 4.25, previous: null },
    csat: { current: 85.5, previous: 80 },
    revenue: { current: 1500000, previous: 1000000 },
};
const range = { from: '2026-09-13', to: '2026-10-12' };

describe('variation', () => {
    it('is “—” without a previous value, with a zero one or without a current one', () => {
        const dash = { text: '—', direction: null, tone: 'neutral' };
        expect(variation(5, null, false)).toEqual(dash);
        expect(variation(5, 0, false)).toEqual(dash);
        expect(variation(null, 5, false)).toEqual(dash);
    });

    it('is the percentage against the previous value, with an arrow and a color', () => {
        expect(variation(12, 10, false)).toEqual({ text: '+20 %', direction: 'up', tone: 'good' });
        expect(variation(5, 10, false)).toEqual({ text: '−50 %', direction: 'down', tone: 'bad' });
    });

    it('colors a rise as bad when going up is bad for that KPI', () => {
        expect(variation(3, 2, true)).toMatchObject({ direction: 'up', tone: 'bad' });
        expect(variation(1, 2, true)).toMatchObject({ direction: 'down', tone: 'good' });
    });

    it('is neutral without change', () => {
        expect(variation(8, 8, false)).toEqual({ text: '0 %', direction: null, tone: 'neutral' });
    });
});

describe('getPersonalAnalyticsController', () => {
    it('shapes the 11 cards in order with formatted values and variations', async () => {
        const get = jest.fn().mockResolvedValue({ kpis });

        const { cards } = await getPersonalAnalyticsController(instrumentation, signedIn, get)(range);

        expect(get).toHaveBeenCalledWith(range);
        expect(cards.map((card) => card.id)).toEqual([
            'booked', 'attended', 'rescheduled', 'cancelled', 'rejected', 'pending',
            'noShows', 'employeeNoShows', 'averageRating', 'csat', 'revenue',
        ]);
        expect(cards[0]).toMatchObject({ label: 'Reservados', value: '12', change: { text: '+20 %', direction: 'up', tone: 'good' } });
        expect(cards[3]).toMatchObject({ label: 'Cancelados', change: { direction: 'up', tone: 'bad' } });
        expect(cards[8]).toMatchObject({ value: '4,3', change: { text: '—' } });
        expect(cards[9]).toMatchObject({ value: '85,5 %' });
        expect(cards[10].value).toMatch(/1\.500\.000/);
    });

    it('shows “—” as the value of a KPI without data', async () => {
        const get = jest.fn().mockResolvedValue({ kpis: { ...kpis, averageRating: { current: null, previous: null } } });

        const { cards } = await getPersonalAnalyticsController(instrumentation, signedIn, get)(range);

        expect(cards[8].value).toBe('—');
    });

    it('rejects a malformed range without calling the use case', async () => {
        const get = jest.fn();

        await expect(getPersonalAnalyticsController(instrumentation, signedIn, get)({ from: 'ayer', to: range.to })).rejects.toBeInstanceOf(
            InputParseError,
        );
        expect(get).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const get = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });

        await expect(getPersonalAnalyticsController(instrumentation, auth, get)(range)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});
