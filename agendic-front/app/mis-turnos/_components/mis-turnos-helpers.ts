import type { ClientBooking } from '@/app/_components/client-booking/types';

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
