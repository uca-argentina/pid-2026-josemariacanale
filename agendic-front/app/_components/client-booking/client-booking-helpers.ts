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

/** El Negocio del Turno o, en un Servicio personal, el Usuario que lo atiende. */
export const hostName = (b: ClientBooking) => b.business?.name ?? b.employeeName;
