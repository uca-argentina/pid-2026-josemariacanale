import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Calendar } from '@/app/_components/weekly-view';
import type { CalendarEvent } from '@/app/_components/weekly-view/types/events';
import type { CalendarComponentProps } from '@/app/_components/weekly-view/types/state';

const TZ = 'America/Argentina/Buenos_Aires';
const events: CalendarEvent[] = [
    { id: 1, title: 'Corte', start: new Date('2026-10-14T14:00:00Z'), end: new Date('2026-10-14T15:00:00Z'), options: { status: 'BOOKED' } },
    { id: 2, title: 'Color', start: new Date('2026-10-14T14:30:00Z'), end: new Date('2026-10-14T15:30:00Z'), options: { status: 'PENDING' } },
];

const render = (props: Partial<CalendarComponentProps> = {}) =>
    renderToStaticMarkup(
        createElement(Calendar, {
            startDate: new Date('2026-10-12T12:00:00Z'),
            endDate: new Date('2026-10-18T12:00:00Z'),
            events,
            timezone: TZ,
            hideHeader: true,
            ...props,
        }),
    );

describe('Calendar', () => {
    it('renders the 7 days and the overlapping events', () => {
        const html = render();
        for (const day of ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']) expect(html).toContain(day);
        expect(html).toContain('data-calendar-event-id="1"');
        expect(html).toContain('data-calendar-event-id="2"');
        expect(html).toContain('Corte');
    });

    it('takes the hour format from the prop', () => {
        expect(render({ timeFormat: 24 })).toContain('13:00');
        expect(render({ timeFormat: 12 })).toMatch(/1:00 ?p\. ?m\./);
    });

    it('renders empty cells for every grid stop', () => {
        const html = render({ gridCellsPerHour: 1 });
        expect(html.match(/data-testid="calendar-empty-cell"/g)).toHaveLength(7 * 24);
    });

    it('renders the week heading unless hidden', () => {
        expect(render({ hideHeader: false })).toContain('Semana siguiente');
        expect(render()).not.toContain('Semana siguiente');
    });
});
