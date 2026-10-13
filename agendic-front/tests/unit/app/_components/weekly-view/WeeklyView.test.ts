import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyView } from '@/app/_components/weekly-view/WeeklyView';
import type { CalendarEvent } from '@/app/_components/weekly-view/types';

const TZ = 'America/Argentina/Buenos_Aires';
const NOW = new Date('2026-10-14T15:00:00Z').getTime();
const events: CalendarEvent[] = [
    { id: 1, title: 'Corte', start: new Date('2026-10-14T14:00:00Z'), end: new Date('2026-10-14T15:00:00Z'), options: { status: 'BOOKED' } },
    { id: 2, title: 'Color', start: new Date('2026-10-14T14:30:00Z'), end: new Date('2026-10-14T15:30:00Z'), options: { status: 'PENDING' } },
];

const render = (timeFormat: 12 | 24) =>
    renderToStaticMarkup(
        createElement(WeeklyView, {
            weekStart: new Date('2026-10-12T12:00:00Z'),
            events,
            timeZone: TZ,
            timeFormat,
            now: NOW,
            onEventClick: () => {},
        }),
    );

describe('WeeklyView', () => {
    it('renders the 7 days, the current time and the overlapping events', () => {
        const html = render(24);
        for (const day of ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']) expect(html).toContain(day);
        expect(html).toContain('12:00');
        expect(html).toContain('data-calendar-event-id="1"');
        expect(html).toContain('data-calendar-event-id="2"');
        expect(html).toContain('Corte');
    });

    it('takes the hour format from the prop', () => {
        expect(render(24)).toContain('13:00');
        expect(render(12)).toMatch(/1:00 ?p\. ?m\./);
    });
});
