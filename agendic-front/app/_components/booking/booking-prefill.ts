import { z } from 'zod';

/** Lo que el Aviso de horario libre deja precargado en la reserva; `date` null y textos vacíos, sin precarga. */
export interface BookingPrefill {
    date: string | null;
    name: string;
    email: string;
}

/** Sin Aviso de horario libre: la reserva abre como siempre. */
export const NO_PREFILL: BookingPrefill = { date: null, name: '', email: '' };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** 'YYYY-MM-DD' de un día que existe en el calendario; `new Date` corrige el 30 de febrero, así que se compara de vuelta. */
function isCalendarDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Lee de la URL del Aviso de horario libre (`?fecha=&nombre=&email=`) solo lo que sirve: una fecha que existe en el
 * calendario y un email válido. Lo inválido se ignora y la reserva abre como siempre. No sabe de zonas horarias: una
 * fecha pasada la resuelve el paso Horario, que abre en la primera semana.
 */
export function readBookingPrefill(params: SearchParams): BookingPrefill {
    const date = first(params.fecha)?.trim();
    const email = first(params.email)?.trim() ?? '';
    return {
        date: date && isCalendarDate(date) ? date : null,
        name: first(params.nombre)?.trim() ?? '',
        email: z.email().safeParse(email).success ? email : '',
    };
}
