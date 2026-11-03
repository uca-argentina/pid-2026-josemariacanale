import { CALENDAR_CONNECT_FAILED_MESSAGE } from '@/app/(app)/_components/calendar-copy';
import { calendarReturnSchema, type CalendarReturn } from '@/src/entities/models/calendar-connection';

/** El `?calendar=` de la URL si es uno de los cuatro que manda el back al volver de Google o de Microsoft; `null` si falta o es otro. */
export function parseCalendarReturn(value: string | undefined): CalendarReturn | null {
    const parsed = calendarReturnSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

/** El mensaje para el Usuario de cada forma de volver del proveedor; el `?calendar=` no dice cuál, así que no lo nombran. */
export const CALENDAR_RETURN_MESSAGES: Record<CalendarReturn, { kind: 'success' | 'error'; message: string }> = {
    connected: { kind: 'success', message: 'Conectamos tu calendario.' },
    denied: { kind: 'error', message:
            'No diste permiso, así que no conectamos tu calendario. Si es una cuenta de empresa, puede necesitar la aprobación de su administrador.', },
    'missing-scope': {
        kind: 'error',
        message: 'No nos diste el permiso para escribir en tu calendario. Volvé a conectar y aceptá todos los permisos.',
    },
    error: { kind: 'error', message: CALENDAR_CONNECT_FAILED_MESSAGE },
};
