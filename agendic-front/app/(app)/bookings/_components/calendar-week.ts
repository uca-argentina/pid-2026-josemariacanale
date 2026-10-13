import { isDay, toIsoDay, toLocalDay } from '@/app/_components/day-range';
import type { CalendarEvent } from '@/app/_components/weekly-view/types/events';
import type { Preferences } from '@/src/entities/models/user';
import { dayKey, isClosed, placeOf, type Booking } from './booking-helpers';

const DAYS_IN_WEEK = 7;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `day` (`YYYY-MM-DD`) más `count` días, que puede ser negativo. */
export function addDays(day: string, count: number) {
    const date = toLocalDay(day);
    date.setDate(date.getDate() + count);
    return toIsoDay(date);
}

/** El primer día de la semana de `day`, según el primer día de las Preferencias (0 = domingo). */
export function weekStartOf(day: string, weekStart: Preferences['weekStart']) {
    return addDays(day, -((toLocalDay(day).getDay() - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK));
}

/** Si `value` es un día válido, la semana que lo contiene; si no, la de `fallback`. */
export const weekOf = (value: string | null, fallback: string, weekStart: Preferences['weekStart']) =>
    weekStartOf(isDay(value) ? value : fallback, weekStart);

/** Los Turnos aceptados y pendientes cuyo día, en la hora de la Sucursal, cae en la semana que arranca en `start`. */
export function bookingsOfWeek(bookings: Booking[], start: string) {
    const end = addDays(start, DAYS_IN_WEEK - 1);
    return bookings.filter((b) => {
        const day = dayKey(b.startsAt);
        return !isClosed(b) && day >= start && day <= end;
    });
}

const part = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return { year, month: MONTHS[month - 1], date };
};

/** El rango de la semana que arranca en `start`, ej. `12 – 18 oct 2026`. */
export function weekTitle(start: string) {
    const from = part(start);
    const to = part(addDays(start, DAYS_IN_WEEK - 1));
    if (from.year !== to.year) return `${from.date} ${from.month} ${from.year} – ${to.date} ${to.month} ${to.year}`;
    if (from.month !== to.month) return `${from.date} ${from.month} – ${to.date} ${to.month} ${to.year}`;
    return `${from.date} – ${to.date} ${to.month} ${to.year}`;
}

/** El Turno como evento de la grilla semanal; la Ausencia del Invitado y la del Anfitrión van en el título. */
export function toCalendarEvent(b: Booking): CalendarEvent {
    const mark = b.noShowAt !== null ? ' · Ausencia del Invitado' : b.employeeNoShowAt !== null ? ' · Ausencia del Anfitrión' : '';
    return {
        id: b.id,
        title: `${b.serviceName} con ${b.clientName}${mark}`,
        description: placeOf(b),
        start: new Date(b.startsAt),
        end: new Date(b.endsAt),
        options: { status: b.status },
    };
}
