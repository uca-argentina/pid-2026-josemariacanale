import { formatLongDate, formatTime } from './format';
import { Ban, CalendarCheck, Hourglass, type LucideIcon } from 'lucide-react';
import type { ClientBooking } from './types';

/** Cómo se le muestra al Cliente cada estado de su Turno. */
export const STATUS_BADGE: Record<ClientBooking['status'], { icon: LucideIcon; label: string }> = {
    PENDING: { icon: Hourglass, label: 'Esperando que lo acepten' },
    BOOKED: { icon: CalendarCheck, label: 'Turno reservado' },
    REJECTED: { icon: Ban, label: 'Turno rechazado' },
    CANCELLED: { icon: Ban, label: 'Turno cancelado' },
};

/** Puede Cancelar o Reagendar: pendiente o aceptado, y todavía no empezó. */
export function isActionable(b: ClientBooking, now: number) {
    return (b.status === 'PENDING' || b.status === 'BOOKED') && Date.parse(b.startsAt) > now;
}

/** La Seña existe y todavía no se pagó. */
export const hasPendingDeposit = (b: ClientBooking) => b.depositAmount !== null && b.depositPaidAt === null;

/** Puede Pagar la Seña: tiene Seña pendiente y el Turno está pendiente o aceptado y no empezó. */
export const canPayDeposit = (b: ClientBooking, now: number) => hasPendingDeposit(b) && isActionable(b, now);

/** El Negocio del Turno o, en un Servicio personal, el Usuario que lo atiende. */
export const hostName = (b: ClientBooking) => b.business?.name ?? b.employeeName;

/** Qué muestra el Turno de la Calificación: el formulario si todavía puede calificar, la suya en solo lectura si ya calificó. */
export const ratingSection = (b: ClientBooking): 'form' | 'readonly' | null => (b.canRate ? 'form' : b.rating ? 'readonly' : null);

/** El Motivo de cancelación que ve el Cliente: solo en un Turno Cancelado o Rechazado que lo tiene. */
export function cancellationReasonOf(b: ClientBooking): string | null {
    return b.status === 'CANCELLED' || b.status === 'REJECTED' ? b.cancellationReason : null;
}

/**
 * Los Turnos de la Serie del Turno (ADR 0007), por fecha, con la etiqueta de su estado y su Enlace del Turno; `current`
 * es el que se está viendo. `null` en un Turno suelto.
 */
export function seriesOf(b: ClientBooking): { startsAt: string; status: string; link: string; current: boolean }[] | null {
    if (!b.series) return null;
    return b.series.bookings.map((s) => ({
        startsAt: s.startsAt,
        status: STATUS_BADGE[s.status].label,
        link: s.link,
        current: s.startsAt === b.startsAt,
    }));
}

/**
 * Si Cancelar ofrece "este y los siguientes": después del Turno vienen Turnos de su Serie todavía pendientes o
 * aceptados. Sin ellos, Cancelar este alcanza.
 */
export function hasFollowingInSeries(b: ClientBooking): boolean {
    return (b.series?.bookings ?? []).some((s) => s.startsAt > b.startsAt && (s.status === 'PENDING' || s.status === 'BOOKED'));
}

/** El aviso de Cancelar "este y los siguientes", con los Turnos que el Plazo de cambios dejó en pie, si hay. */
export function keptNotice(kept: { startsAt: string }[], timeZone: string): string {
    if (kept.length === 0) return 'Cancelamos este turno y los siguientes.';
    const dates = kept.map((k) => `${formatLongDate(k.startsAt, timeZone)} a las ${formatTime(k.startsAt, timeZone)}`);
    const list = dates.length === 1 ? dates[0] : `${dates.slice(0, -1).join(', ')} y ${dates.at(-1)}`;
    return kept.length === 1
        ? `Cancelamos este turno y los siguientes, salvo el del ${list}, que quedó en pie por el plazo de cambios.`
        : `Cancelamos este turno y los siguientes, salvo los del ${list}, que quedaron en pie por el plazo de cambios.`;
}
