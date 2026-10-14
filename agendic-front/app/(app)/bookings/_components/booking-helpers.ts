import type { DayRange } from '@/app/_components/day-range';
import type { DI_RETURN_TYPES } from '@/di/types';
import type { Preferences } from '@/src/entities/models/user';

/** Un Turno de Mis turnos del Usuario, como lo arma el controller. */
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

/** Dónde pasa el Turno: "Negocio · Sucursal", o "Servicio personal" si no tiene Negocio. */
export const placeOf = (b: Booking) => (b.business && b.branch ? `${b.business.name} · ${b.branch.name}` : 'Servicio personal');

/** La Cabina que ocupa el Turno, o null si no ocupa ninguna: en ese caso no se muestra nada. */
export const cabinOf = (b: Booking) => b.cabin?.name ?? null;

/** El Empleado puede marcar la Ausencia del Invitado: el Turno no tiene ya una Ausencia del Invitado ni una del Anfitrión (se excluyen, ADR 0004). */
export const canMarkNoShow = (b: Booking) => b.noShowAt === null && b.employeeNoShowAt === null;

export const isClosed = (b: Booking) => b.status === 'CANCELLED' || b.status === 'REJECTED';

/** Un Turno pendiente o aceptado cuya Seña todavía no se pagó. */
export const hasPendingDeposit = (b: Booking) =>
    (b.status === 'PENDING' || b.status === 'BOOKED') && b.depositAmount !== null && b.depositPaidAt === null;

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

const timeFormats = {
    24: new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    12: new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hourCycle: 'h12' }),
};
/** `HH:MM` (24) o `h:MM a. m.` (12), según las Preferencias del Usuario; sin ellas, 24. */
export const formatTime = (at: string | number, timeFormat: Preferences['timeFormat'] = 24) =>
    timeFormats[timeFormat].format(new Date(at)).replace(/[  ]/g, ' ');
/** `HH:MM – HH:MM` del Turno. */
export const formatTimeRange = (b: Booking, timeFormat?: Preferences['timeFormat']) =>
    `${formatTime(b.startsAt, timeFormat)} – ${formatTime(b.endsAt, timeFormat)}`;

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
    branch: placeOf,
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

/** Si el día del `startsAt` del Turno, en la hora de la Sucursal, cae en el rango (extremos incluidos); sin rango, sí. */
export const matchesRange = (b: Booking, range: DayRange | null) => {
    if (!range) return true;
    const day = dayKey(b.startsAt);
    return day >= range.from && day <= range.to;
};

/** Lo que se puede hacer con un Turno: `main` son los botones y `menu` lo que va en el menú "…". */
export type BookingActionId = 'accept' | 'reject' | 'cancel' | 'reschedule' | 'no-show';

/**
 * Las acciones del Turno según su estado: Aceptar y Rechazar en uno pendiente; Cancelar y Reagendar en
 * uno aceptado y futuro; Marcar ausencia en uno aceptado y pasado que todavía no tiene una marca.
 */
export function actionsOf(b: Booking, now: number): { main: BookingActionId[]; menu: BookingActionId[] } {
    if (b.status === 'PENDING') return { main: ['accept', 'reject'], menu: [] };
    if (b.status !== 'BOOKED') return { main: [], menu: [] };
    if (Date.parse(b.endsAt) >= now) return b.noShowAt === null ? { main: [], menu: ['cancel', 'reschedule'] } : { main: [], menu: [] };
    return { main: [], menu: canMarkNoShow(b) ? ['no-show'] : [] };
}

/** El Turno anterior y el siguiente a `id` dentro de `list`; sin `id` en la lista, ninguno. */
export function neighboursOf(list: Booking[], id: number): { previous: Booking | null; next: Booking | null } {
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) return { previous: null, next: null };
    return { previous: list[index - 1] ?? null, next: list[index + 1] ?? null };
}

const GREEN = 'bg-[#e6f6ec] text-[#15803d]';
const RED = 'bg-[#fdecec] text-[#b91c1c]';
const AMBER = 'bg-[#fff4e5] text-[#b45309]';

/** Los badges de un Turno en la lista; `Reagendado` marca al que reemplazó a otro (ADR 0031). */
export function badgesOf(b: Booking): { label: string; className: string }[] {
    return [
        b.status === 'PENDING' && { label: 'Pendiente', className: AMBER },
        hasPendingDeposit(b) && { label: 'Seña pendiente', className: AMBER },
        b.status === 'BOOKED' && b.noShowAt !== null && { label: 'Ausencia del Invitado', className: RED },
        b.status === 'BOOKED' && b.employeeNoShowAt !== null && { label: 'Ausencia del Anfitrión', className: RED },
        b.fromRescheduleId !== null && { label: 'Reagendado', className: AMBER },
        b.status === 'REJECTED' && { label: 'Rechazado', className: RED },
        b.status === 'CANCELLED' && { label: 'Cancelado', className: RED },
    ].filter((badge) => !!badge);
}

/** Los badges del panel lateral: los de la lista y, en un Turno aceptado sin marcas, `Aceptado`. */
export function statusBadgesOf(b: Booking): { label: string; className: string }[] {
    const accepted = b.status === 'BOOKED' && b.noShowAt === null && b.employeeNoShowAt === null;
    return [...(accepted ? [{ label: 'Aceptado', className: GREEN }] : []), ...badgesOf(b)];
}
