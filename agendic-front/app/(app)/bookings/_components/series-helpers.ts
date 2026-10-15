import type { Preferences } from '@/src/entities/models/user';
import { formatTime, TIME_ZONE } from '@/app/(app)/_components/booking-format';
import type { Booking } from './booking-helpers';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weekdayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'long' });

/** Un Turno vigente: pendiente o aceptado, ni Cancelado ni Rechazado. */
const isActive = (b: Booking) => b.status === 'PENDING' || b.status === 'BOOKED';

/** Un Turno vigente que todavía no terminó: lo que "quedan N" cuenta. */
const isUpcoming = (b: Booking, now: number) => isActive(b) && Date.parse(b.endsAt) >= now;

const byStart = (a: Booking, b: Booking) => Date.parse(a.startsAt) - Date.parse(b.startsAt);

/**
 * Cada cuánto se repite una Serie, para la pestaña Series: "todos los martes 10:00" o "cada 2 semanas, martes 10:00".
 * Se lee de los Turnos vigentes (si no queda ninguno, de todos), y el salto es el más corto entre dos: una fecha
 * salteada al Reservar, o un Turno cancelado, no cambia cada cuánto se repite.
 */
export function seriesFrequency(series: Booking[], timeFormat: Preferences['timeFormat'] = 24): string {
    const active = series.filter(isActive);
    const sorted = [...(active.length > 0 ? active : series)].sort(byStart);
    const first = sorted[0];
    const gaps = sorted.slice(1).map((b, i) => Date.parse(b.startsAt) - Date.parse(sorted[i].startsAt)).filter((gap) => gap > 0);
    const weeks = gaps.length > 0 ? Math.max(1, Math.round(Math.min(...gaps) / WEEK_MS)) : 1;
    const weekday = weekdayFormat.format(new Date(first.startsAt));
    const time = formatTime(first.startsAt, timeFormat);
    if (weeks === 1) return `todos los ${weekday.endsWith('s') ? weekday : `${weekday}s`} ${time}`;
    return `cada ${weeks} semanas, ${weekday} ${time}`;
}

/**
 * Una fila de la pestaña Series. `next` es el próximo Turno por venir (el que abre el panel); `firstBooked` el primero
 * aceptado por venir, desde el que se Cancelan los restantes (el back pide uno aceptado); `firstPending`, el primero
 * pendiente, sobre el que se Aceptan o Rechazan todos; `pending`, cuántos esperan que se Acepten o Rechacen.
 */
export interface SeriesRow {
    seriesId: string;
    next: Booking;
    firstBooked: Booking | null;
    firstPending: Booking | null;
    /** "quedan N de M": N son los por venir, M todos los Turnos de la Serie en la lista. */
    remaining: number;
    total: number;
    pending: number;
    bookings: Booking[];
}

/** Una fila por Serie con Turnos por venir, agrupando por `seriesId`, de la que viene antes a la que viene después. */
export function seriesRowsOf(bookings: Booking[], now: number): SeriesRow[] {
    const groups = new Map<string, Booking[]>();
    for (const b of bookings) if (b.seriesId !== null) groups.set(b.seriesId, [...(groups.get(b.seriesId) ?? []), b]);

    const rows: SeriesRow[] = [];
    for (const [seriesId, group] of groups) {
        const sorted = [...group].sort(byStart);
        const upcoming = sorted.filter((b) => isUpcoming(b, now));
        if (upcoming.length === 0) continue;
        rows.push({
            seriesId,
            next: upcoming[0],
            firstBooked: upcoming.find((b) => b.status === 'BOOKED') ?? null,
            firstPending: upcoming.find((b) => b.status === 'PENDING') ?? null,
            remaining: upcoming.length,
            total: sorted.length,
            pending: upcoming.filter((b) => b.status === 'PENDING').length,
            bookings: sorted,
        });
    }
    return rows.sort((a, b) => byStart(a.next, b.next));
}

/**
 * Pendientes muestra una Serie una sola vez: en su primer Turno pendiente de `list`, con `seriesPending`, para
 * "Aceptar la Serie (N Turnos)". N son los pendientes por venir de toda la Serie en `all`, sin filtros, porque son los
 * que el back acepta. Un Turno suelto, o una Serie con un solo pendiente por venir, queda igual, con `seriesPending`
 * null. Respeta el orden de `list`.
 */
export function collapsePendingSeries(list: Booking[], all: Booking[], now: number): { booking: Booking; seriesPending: number | null }[] {
    const counts = new Map<string, number>();
    for (const b of all)
        if (b.seriesId !== null && b.status === 'PENDING' && Date.parse(b.endsAt) >= now) counts.set(b.seriesId, (counts.get(b.seriesId) ?? 0) + 1);
    const seen = new Set<string>();
    return list.flatMap((b): { booking: Booking; seriesPending: number | null }[] => {
        if (b.seriesId === null || (counts.get(b.seriesId) ?? 0) < 2) return [{ booking: b, seriesPending: null }];
        if (seen.has(b.seriesId)) return [];
        seen.add(b.seriesId);
        return [{ booking: b, seriesPending: counts.get(b.seriesId)! }];
    });
}

/** Los demás Turnos de la Serie de `booking`, por fecha; ninguno si es un Turno suelto. */
export function seriesMatesOf(bookings: Booking[], booking: Booking): Booking[] {
    if (booking.seriesId === null) return [];
    return bookings.filter((b) => b.seriesId === booking.seriesId && b.id !== booking.id).sort(byStart);
}

/** Si "Cancelar este y los siguientes" tiene sentido: después de `booking` vienen Turnos de su Serie pendientes o aceptados. */
export function hasFollowingInSeries(bookings: Booking[], booking: Booking): boolean {
    return seriesMatesOf(bookings, booking).some(
        (b) => Date.parse(b.startsAt) > Date.parse(booking.startsAt) && isActive(b),
    );
}
