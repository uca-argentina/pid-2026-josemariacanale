import { CALENDAR_CONNECT_FAILED_MESSAGE } from '@/app/(app)/_components/calendar-copy';
import { calendarReturnSchema, type CalendarReturn } from '@/src/entities/models/calendar-connection';

/** El `?calendar=` de la URL si es uno de los cuatro que manda el back al volver de Google; `null` si falta o es otro. */
export function parseCalendarReturn(value: string | undefined): CalendarReturn | null {
    const parsed = calendarReturnSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

/** El mensaje para el Usuario de cada forma de volver de Google. */
export const CALENDAR_RETURN_MESSAGES: Record<CalendarReturn, { kind: 'success' | 'error'; message: string }> = {
    connected: { kind: 'success', message: 'Conectamos tu Google Calendar.' },
    denied: { kind: 'error', message: 'No diste permiso a Google, así que no conectamos tu calendario.' },
    'missing-scope': {
        kind: 'error',
        message: 'Google no nos dio el permiso para escribir en tu calendario. Volvé a conectar y aceptá todos los permisos.',
    },
    error: { kind: 'error', message: CALENDAR_CONNECT_FAILED_MESSAGE },
};
