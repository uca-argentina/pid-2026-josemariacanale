import dayjs from 'dayjs';
import {
    getDaysBetweenDates,
    getHoursToDisplay,
    gridCellToDateTime,
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
