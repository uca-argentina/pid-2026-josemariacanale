import { dayKey, eventsOfDay, formatDayHeader, formatTimeIn, minutesFromStart } from '@/app/_components/weekly-view/grid-math';
import type { CalendarEvent } from '@/app/_components/weekly-view/types';

const TZ = 'America/Argentina/Buenos_Aires';
const event = (id: number, start: string, end: string, allDay = false): CalendarEvent => ({
    id,
    title: `e${id}`,
    start: new Date(start),
    end: new Date(end),
    options: { allDay },
});

describe('formatTimeIn', () => {
    const at = new Date('2026-10-12T18:05:00Z');

    it('formats 24h in the given zone', () => {
        expect(formatTimeIn(at, TZ, 24)).toBe('15:05');
    });

    it('formats 12h in the given zone', () => {
        expect(formatTimeIn(at, TZ, 12)).toMatch(/^3:05 ?p\. ?m\.$/);
    });
});

describe('formatDayHeader', () => {
    it('shows weekday and day number in the given zone', () => {
        expect(formatDayHeader(new Date('2026-10-12T12:00:00Z'), TZ)).toEqual({ weekday: 'LUN', day: '12' });
    });
});

describe('minutesFromStart', () => {
    it('counts minutes since midnight in the zone', () => {
        expect(minutesFromStart(new Date('2026-10-12T18:05:00Z'), TZ)).toBe(15 * 60 + 5);
    });
});

describe('dayKey', () => {
    it('uses the zone, not UTC', () => {
        expect(dayKey(new Date('2026-10-13T01:00:00Z'), TZ)).toBe('2026-10-12');
    });
});

describe('eventsOfDay', () => {
    it('keeps the events that start that day in the zone and drops all-day ones', () => {
        const a = event(1, '2026-10-12T13:00:00Z', '2026-10-12T14:00:00Z');
        const b = event(2, '2026-10-13T13:00:00Z', '2026-10-13T14:00:00Z');
        const c = event(3, '2026-10-12T13:00:00Z', '2026-10-12T14:00:00Z', true);
        expect(eventsOfDay([a, b, c], '2026-10-12', TZ)).toEqual([a]);
    });
});
