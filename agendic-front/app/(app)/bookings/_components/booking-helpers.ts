import type { DI_RETURN_TYPES } from '@/di/types';

/** Un Turno de la lista "mis turnos" del Empleado, como lo arma el controller. */
export type Booking = Awaited<ReturnType<DI_RETURN_TYPES['IListMyBookingsController']>>[number];

/** Pestañas de la lista de Turnos. */
export type BookingTab = 'upcoming' | 'pending' | 'past' | 'cancelled';

/**
 * ponytail: todas las Sucursales están en Argentina, sin horario de verano. Con Sucursales en otras zonas,
 * cada Turno formatea y arma horarios con el `Branch.timeZone` de su Sucursal.
 */
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';
/** Cómo se rotula la zona horaria en pantalla. */
export const TIME_ZONE_LABEL = 'hora de Argentina';
const UTC_OFFSET = '-03:00';

const DAY_MS = 24 * 60 * 60 * 1000;

/** El instante de `day` (`YYYY-MM-DD`) a la hora `hhmm` en la hora de la Sucursal. */
export const localInstant = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00${UTC_OFFSET}`);

export const isClosed = (b: Booking) => b.status === 'CANCELLED' || b.status === 'REJECTED';

/** La pestaña del Turno. */
export function tabOf(b: Booking, now: number): BookingTab | null {
    if (isClosed(b)) return 'cancelled';
    if (b.status === 'PENDING') return 'pending';
    if (b.status !== 'BOOKED') return null;
    return Date.parse(b.endsAt) < now ? 'past' : 'upcoming';
}

/** Lo que viene, del más cercano al más lejano; lo que ya pasó, del más reciente al más viejo. */
export function sortForTab(tab: BookingTab, list: Booking[]) {
    const dir = tab === 'upcoming' || tab === 'pending' ? 1 : -1;
    return [...list].sort((a, b) => dir * (Date.parse(a.startsAt) - Date.parse(b.startsAt)));
}

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
/** `YYYY-MM-DD` en la hora de la Sucursal. */
export const dayKey = (at: string | number) => dayKeyFormat.format(new Date(at));

const timeFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** `HH:MM`, 00–23. */
export const formatTime = (at: string | number) => timeFormat.format(new Date(at));
/** `HH:MM – HH:MM` del Turno. */
export const formatTimeRange = (b: Booking) => `${formatTime(b.startsAt)} – ${formatTime(b.endsAt)}`;

const shortDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
/** Día corto, ej. `mar 15 sep`. */
export const formatShortDay = (at: string) => shortDayFormat.format(new Date(at)).replace(/\./g, '');

const longDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
const longDateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, dateStyle: 'full' });
/** Fecha completa, ej. `martes, 15 de septiembre de 2026`. */
export const formatLongDate = (at: string) => longDateFormat.format(new Date(at));

/** `Hoy`, `Mañana`, `Ayer` o el día largo. */
export function dayLabel(at: string, now: number) {
    const key = dayKey(at);
    if (key === dayKey(now)) return 'Hoy';
    if (key === dayKey(now + DAY_MS)) return 'Mañana';
    if (key === dayKey(now - DAY_MS)) return 'Ayer';
    return longDayFormat.format(new Date(at));
}

/** Agrupa por día respetando el orden de entrada. */
export function groupByDay(list: Booking[], now: number) {
    const groups: { label: string; items: Booking[] }[] = [];
    for (const b of list) {
        const label = dayLabel(b.startsAt, now);
        const last = groups.at(-1);
        if (last?.label === label) last.items.push(b);
        else groups.push({ label, items: [b] });
    }
    return groups;
}

/** Campos de filtro de lista: se eligen entre los valores presentes. */
export type ListField = 'service' | 'branch';
/** Campos de filtro de texto libre sobre el Cliente. */
export type TextField = 'clientName' | 'clientEmail';
/** Cualquier campo filtrable. */
export type FilterField = ListField | TextField;
/** `is`: igual; `contains`: incluye. */
export type TextOp = 'is' | 'contains';

/** Un filtro activo de la lista. */
export type BookingFilter = { field: ListField; values: string[] } | { field: TextField; op: TextOp; value: string };

const LIST_VALUE: Record<ListField, (b: Booking) => string> = {
    service: (b) => b.serviceName,
    branch: (b) => `${b.businessName} · ${b.branchName}`,
};

/** El valor que un filtro de lista compara y ofrece como opción. */
export const listValueOf = (field: ListField, b: Booking) => LIST_VALUE[field](b);

/** Un filtro sin valor no filtra nada. */
export function matches(b: Booking, filters: BookingFilter[]) {
    return filters.every((f) => {
        if ('values' in f) return f.values.length === 0 || f.values.includes(listValueOf(f.field, b));
        const actual = b[f.field];
        const wanted = f.value.trim().toLowerCase();
        if (!wanted) return true;
        return f.op === 'is' ? actual.toLowerCase() === wanted : actual.toLowerCase().includes(wanted);
    });
}
