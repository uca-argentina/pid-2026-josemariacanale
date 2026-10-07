import type { ClientBooking } from '../actions';

export type Tab = 'upcoming' | 'past';

/**
 * Próximos: `PENDING` y `BOOKED` que no terminaron. Historial: los que terminaron, más `CANCELLED` y
 * `REJECTED` (también futuros): un `PENDING` que pasó sin aceptarse va a Historial.
 */
export function tabOf(b: ClientBooking, now: number): Tab {
    if (b.status === 'CANCELLED' || b.status === 'REJECTED') return 'past';
    return Date.parse(b.endsAt) < now ? 'past' : 'upcoming';
}

/** Lo que viene, del más cercano al más lejano; el Historial, del más reciente al más viejo. */
export function sortForTab(tab: Tab, list: ClientBooking[]) {
    const dir = tab === 'upcoming' ? 1 : -1;
    return [...list].sort((a, b) => dir * (Date.parse(a.startsAt) - Date.parse(b.startsAt)));
}

/** Puede Cancelar o Reagendar: pendiente o aceptado, y todavía no empezó. */
export function isActionable(b: ClientBooking, now: number) {
    return (b.status === 'PENDING' || b.status === 'BOOKED') && Date.parse(b.startsAt) > now;
}

export const hostName = (b: ClientBooking) => b.business?.name ?? b.employeeName;
