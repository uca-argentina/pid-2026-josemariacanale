import { formatBucket, variation } from '@/src/interface-adapters/presenters/analytics.presenter';

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

describe('formatBucket', () => {
    it.each([
        ['day', '2026-10-12', '12 oct'],
        ['week', '2026-10-05', '5 oct'],
        ['month', '2026-10-01', 'oct 2026'],
        ['month', '2027-01-01', 'ene 2027'],
    ] as const)('formats a %s bucket %s as %s', (granularity, bucket, expected) => {
        expect(formatBucket(bucket, granularity)).toBe(expected);
    });
});
