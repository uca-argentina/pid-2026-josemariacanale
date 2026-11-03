import type { AccountCalendar } from '@/src/entities/models/calendar-connection';

/** Da forma a los calendarios de la cuenta conectada para el cliente; lo comparten el controller que los lista y el que guarda la selección. */
export function accountCalendarsPresenter(calendars: AccountCalendar[]) {
    return calendars.map((c) => ({ id: c.id, name: c.name, primary: c.primary, checked: c.checked }));
}
