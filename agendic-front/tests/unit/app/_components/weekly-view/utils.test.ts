import dayjs from 'dayjs';
import {
    getDaysBetweenDates,
    getHoursToDisplay,
    gridCellToDateTime,
    formatTime,
    mergeOverlappingDateRanges,
} from '@/app/_components/weekly-view/utils';

describe('getDaysBetweenDates', () => {
    it('returns each day from the start of the first to the start of the last, inclusive', () => {
        const days = getDaysBetweenDates(new Date(2024, 0, 1, 15, 30), new Date(2024, 0, 3, 9));

        expect(days.map((d) => d.format('YYYY-MM-DD'))).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
        expect(days[0].hour()).toBe(0);
        expect(days[0].minute()).toBe(0);
    });

    it('returns one day when both dates fall on the same day', () => {
        expect(getDaysBetweenDates(new Date(2024, 0, 1, 8), new Date(2024, 0, 1, 20))).toHaveLength(1);
    });

    it('returns at most 7 days', () => {
        expect(getDaysBetweenDates(new Date(2024, 0, 1), new Date(2024, 0, 31))).toHaveLength(7);
    });
});

describe('getHoursToDisplay', () => {
    it('returns every hour from startHour to endHour, inclusive', () => {
        const hours = getHoursToDisplay(8, 11, 'UTC');

        expect(hours.map((h) => h.hour())).toEqual([8, 9, 10, 11]);
    });
});

describe('gridCellToDateTime in a non-UTC zone', () => {
    it('reads the cell in the given zone', () => {
        const date = gridCellToDateTime({
            day: dayjs('2024-01-01T12:00:00Z'),
            gridCellIdx: 0,
            totalGridCells: 48,
            selectionLength: 23,
            startHour: 9,
            timezone: 'America/Argentina/Buenos_Aires',
        });

        expect(date.format('YYYY-MM-DD HH:mm')).toBe('2024-01-01 09:00');
        expect(date.utcOffset()).toBe(-180);
    });
});

describe('getHoursToDisplay without a timezone', () => {
    it('still returns every hour', () => {
        expect(getHoursToDisplay(8, 10).map((h) => h.hour())).toEqual([8, 9, 10]);
    });
});

describe('gridCellToDateTime', () => {
    const day = dayjs('2024-01-01T00:00:00Z');

    it('maps the first cell to the start hour', () => {
        const date = gridCellToDateTime({
            day,
            gridCellIdx: 0,
            totalGridCells: 48,
            selectionLength: 23,
            startHour: 9,
            timezone: 'UTC',
        });

        expect(date.format('YYYY-MM-DD HH:mm')).toBe('2024-01-01 09:00');
    });

    it('advances minutesPerCell for each cell index', () => {
        const date = gridCellToDateTime({
            day,
            gridCellIdx: 3,
            totalGridCells: 48,
            selectionLength: 23,
            startHour: 9,
            timezone: 'UTC',
        });

        expect(date.format('HH:mm')).toBe('10:30');
    });
});

describe('getDaysBetweenDates with a timezone', () => {
    it('reads the days in that zone', () => {
        const days = getDaysBetweenDates(new Date('2026-10-13T01:00:00Z'), new Date('2026-10-14T01:00:00Z'), 'America/Argentina/Buenos_Aires');

        expect(days.map((d) => d.format('YYYY-MM-DD HH:mm'))).toEqual(['2026-10-12 00:00', '2026-10-13 00:00']);
    });
});

describe('formatTime', () => {
    const at = new Date('2026-10-12T18:05:00Z');

    it('formats 24h in the given zone', () => {
        expect(formatTime(at, 'America/Argentina/Buenos_Aires', 24)).toBe('15:05');
    });

    it('formats 12h in the given zone', () => {
        expect(formatTime(at, 'America/Argentina/Buenos_Aires', 12)).toMatch(/^3:05 ?p\. ?m\.$/);
    });
});

describe('mergeOverlappingDateRanges', () => {
    it('merges ranges that overlap or touch and keeps the rest apart', () => {
        const at = (h: number) => new Date(Date.UTC(2026, 9, 12, h));
        const merged = mergeOverlappingDateRanges([
            { start: at(12), end: at(13) },
            { start: at(9), end: at(11) },
            { start: at(10), end: at(12) },
        ]);

        expect(merged).toEqual([{ start: at(9), end: at(13) }]);
    });
});
