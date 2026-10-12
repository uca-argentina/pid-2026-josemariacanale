import {
    matchesFilters,
    parseFilters,
    resolveRange,
    writeFilters,
    type OutOfOfficeFilters,
} from '@/app/(app)/availability/out-of-office/_components/out-of-office-filters';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';

const today = '2026-10-12';

const period = (overrides: Partial<OutOfOffice> = {}): OutOfOffice => ({
    id: 1,
    startDate: '2026-10-05',
    endDate: '2026-10-07',
    reason: 'TRAVEL',
    notes: 'Congreso en Córdoba',
    showNotePublicly: false,
    ...overrides,
});

describe('parseFilters / writeFilters', () => {
    it.each<OutOfOfficeFilters>([
        { q: '', range: null },
        { q: 'viaje', range: { preset: '7d' } },
        { q: '', range: { preset: 'custom', from: '2026-10-01', to: '2026-10-10' } },
    ])('round-trips %j', (filters) => {
        expect(parseFilters(writeFilters(filters))).toEqual(filters);
    });

    it('keeps the params that are not filters', () => {
        const params = writeFilters({ q: 'x', range: null }, new URLSearchParams('type=mine&rango=7d'));
        expect(params.toString()).toBe('type=mine&q=x');
    });

    it('ignores an unknown preset and a custom range without valid days', () => {
        expect(parseFilters(new URLSearchParams('rango=w')).range).toBeNull();
        expect(parseFilters(new URLSearchParams('rango=custom&desde=2026-10-10&hasta=2026-10-01')).range).toBeNull();
        expect(parseFilters(new URLSearchParams('rango=custom&desde=ayer&hasta=2026-10-01')).range).toBeNull();
    });
});

describe('resolveRange', () => {
    it.each([
        ['today', { from: '2026-10-12', to: '2026-10-12' }],
        ['7d', { from: '2026-10-06', to: '2026-10-12' }],
        ['30d', { from: '2026-09-13', to: '2026-10-12' }],
        ['90d', { from: '2026-07-15', to: '2026-10-12' }],
        ['mtd', { from: '2026-10-01', to: '2026-10-12' }],
        ['ytd', { from: '2026-01-01', to: '2026-10-12' }],
        ['next7d', { from: '2026-10-12', to: '2026-10-18' }],
    ] as const)('%s', (preset, expected) => {
        expect(resolveRange({ preset }, today)).toEqual(expected);
    });

    it('crosses a year boundary', () => {
        expect(resolveRange({ preset: 'next7d' }, '2026-12-29')).toEqual({ from: '2026-12-29', to: '2027-01-04' });
    });
});

describe('matchesFilters', () => {
    it('keeps a period with at least one day in the range', () => {
        expect(matchesFilters(period(), { q: '', range: { preset: '7d' } }, today)).toBe(true);
        expect(matchesFilters(period({ startDate: '2026-09-01', endDate: '2026-10-06' }), { q: '', range: { preset: '7d' } }, today)).toBe(true);
    });

    it('drops a period outside the range', () => {
        expect(matchesFilters(period(), { q: '', range: { preset: 'next7d' } }, today)).toBe(false);
    });

    it('searches the Motivo and the notes ignoring case and accents', () => {
        expect(matchesFilters(period(), { q: 'VIAJE', range: null }, today)).toBe(true);
        expect(matchesFilters(period(), { q: 'cordoba', range: null }, today)).toBe(true);
        expect(matchesFilters(period(), { q: 'vacaciones', range: null }, today)).toBe(false);
    });
});
