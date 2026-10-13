import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { CalendarEvent } from './types';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Formato de hora del panel: 12 o 24 horas. */
export type TimeFormat = 12 | 24;

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** La hora de `at` en la zona `timeZone`, en 12 o 24 horas. Cambia los espacios finos que emite ICU por un espacio común. */
export function formatTimeIn(at: Date | string | number, timeZone: string, timeFormat: TimeFormat) {
    const key = `${timeZone}|${timeFormat}`;
    let formatter = timeFormatters.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('es-AR', {
            timeZone,
            hour: timeFormat === 24 ? '2-digit' : 'numeric',
            minute: '2-digit',
            hourCycle: timeFormat === 24 ? 'h23' : 'h12',
        });
        timeFormatters.set(key, formatter);
    }
    return formatter.format(new Date(at)).replace(/[  ]/g, ' ');
}

/** El encabezado de un día: "LUN" y "12", leídos en la zona `timeZone`. */
export function formatDayHeader(day: Date, timeZone: string) {
    const weekday = new Intl.DateTimeFormat('es-AR', { timeZone, weekday: 'short' }).format(day);
    return { weekday: weekday.replace('.', '').toUpperCase(), day: dayjs(day).tz(timeZone).format('D') };
}

/** Minutos desde la medianoche de `at` en la zona `timeZone`: de ahí sale la altura en la grilla. */
export function minutesFromStart(at: Date | string | number, timeZone: string) {
    const d = dayjs(at).tz(timeZone);
    return d.hour() * 60 + d.minute();
}

/** El día de `at` como `YYYY-MM-DD` en la zona `timeZone`. */
export function dayKey(at: Date | string | number, timeZone: string) {
    return dayjs(at).tz(timeZone).format('YYYY-MM-DD');
}

/** Los eventos que arrancan en el día `key`, sin los de día entero. */
export function eventsOfDay(events: CalendarEvent[], key: string, timeZone: string) {
    return events.filter((event) => !event.options?.allDay && dayKey(event.start, timeZone) === key);
}
