import { formatBucket, variation } from '@/src/interface-adapters/presenters/analytics.presenter';

describe('variation', () => {
    it('is a flat 0 % without a previous value, with a zero one or without a current one', () => {
        const flat = { text: '0 %', direction: 'flat', tone: 'neutral' };
        expect(variation(5, null)).toEqual(flat);
        expect(variation(5, 0)).toEqual(flat);
        expect(variation(null, 5)).toEqual(flat);
    });

    it('is the percentage against the previous value, with its direction', () => {
        expect(variation(12, 10)).toEqual({ text: '+20 %', direction: 'up', tone: 'good' });
        expect(variation(5, 10)).toEqual({ text: '−50 %', direction: 'down', tone: 'bad' });
    });

    it('is bad going up and good going down for a KPI that worsens when it goes up', () => {
        expect(variation(12, 10, true)).toMatchObject({ direction: 'up', tone: 'bad' });
        expect(variation(5, 10, true)).toMatchObject({ direction: 'down', tone: 'good' });
    });

    it('is flat without change', () => {
        expect(variation(8, 8)).toEqual({ text: '0 %', direction: 'flat', tone: 'neutral' });
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
