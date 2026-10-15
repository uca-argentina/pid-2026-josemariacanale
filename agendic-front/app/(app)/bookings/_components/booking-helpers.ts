import type { DayRange } from '@/app/_components/day-range';
import type { DI_RETURN_TYPES } from '@/di/types';
import { dayKey, dayLabel, placeOf } from '@/app/(app)/_components/booking-format';

/** Un Turno de Mis turnos del Usuario, como lo arma el controller. */
export type Booking = Awaited<ReturnType<DI_RETURN_TYPES['IListMyBookingsController']>>[number];

/** Pestañas de la lista de Turnos. */
export type BookingTab = 'upcoming' | 'pending' | 'past' | 'cancelled';

/** La Cabina que ocupa el Turno, o null si no ocupa ninguna: en ese caso no se muestra nada. */
export const cabinOf = (b: Booking) => b.cabin?.name ?? null;

/** El Empleado puede marcar la Ausencia del Invitado: el Turno no tiene ya una Ausencia del Invitado ni una del Anfitrión (se excluyen, ADR 0004). */
export const canMarkNoShow = (b: Booking) => b.noShowAt === null && b.employeeNoShowAt === null;

/** Quién Canceló o Rechazó, como sigue a "Cancelado por": en Mis turnos el Empleado es el propio Usuario. */
const CANCELLED_BY_LABELS = { EMPLOYEE: 'vos', CLIENT: 'el Cliente', RETIREMENT: 'una baja' } as const;
const CAUSE_LABELS = { OUT_OF_OFFICE: 'Fuera de la oficina', PUBLIC_HOLIDAY: 'Día festivo', SCHEDULE_CHANGE: 'Cambio de horario' } as const;

/**
 * Lo que el detalle muestra de la cancelación: quién Canceló o Rechazó, el Motivo y la etiqueta de la Causa
 * (ADR 0034). Null si el Turno no está cerrado o se cerró antes de que se guardara quién.
 */
export function cancellationOf(b: Booking): { by: string; reason: string | null; cause: string | null } | null {
    if (!isClosed(b) || b.cancelledBy === null) return null;
    return {
        by: CANCELLED_BY_LABELS[b.cancelledBy],
        reason: b.cancellationReason,
        cause: b.cancellationCause === null ? null : CAUSE_LABELS[b.cancellationCause],
    };
}

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
