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
