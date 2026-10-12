import { parseRange, presetRange } from '@/app/(app)/analytics/_components/analytics-range';

const today = '2026-10-12';

describe('presetRange', () => {
    it.each([
        ['today', { from: '2026-10-12', to: '2026-10-12' }],
        ['7d', { from: '2026-10-06', to: '2026-10-12' }],
        ['30d', { from: '2026-09-13', to: '2026-10-12' }],
        ['mtd', { from: '2026-10-01', to: '2026-10-12' }],
        ['ytd', { from: '2026-01-01', to: '2026-10-12' }],
    ] as const)('resolves %s', (preset, expected) => {
        expect(presetRange(preset, today)).toEqual(expected);
    });
});

describe('parseRange', () => {
    const parse = (search: string) => parseRange(new URLSearchParams(search), today);

    it('defaults to the last 30 days', () => {
        expect(parse('')).toEqual({ preset: '30d', from: '2026-09-13', to: today });
    });

    it('reads a preset', () => {
        expect(parse('range=7d')).toEqual({ preset: '7d', from: '2026-10-06', to: today });
    });

    it('reads a custom range', () => {
        expect(parse('from=2026-08-01&to=2026-08-31')).toEqual({ preset: 'custom', from: '2026-08-01', to: '2026-08-31' });
    });

    it.each(['range=90d', 'from=2026-08-01', 'from=2026-13-45&to=2026-10-01', 'from=2026-09-02&to=2026-09-01', 'from=2024-01-01&to=2026-01-01'])(
        'ignores the invalid URL %s',
        (search) => {
            expect(parse(search)).toEqual({ preset: '30d', from: '2026-09-13', to: today });
        },
    );
});
