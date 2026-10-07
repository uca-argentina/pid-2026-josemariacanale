'use server';

import { getInjection } from '@/di/container';
import { performClientBookingAction } from '@/app/_components/client-booking/perform-client-booking-action';

// El Enlace del Turno es la credencial (ADR 0022): sin Sesión ni acceso, viaja como parámetro en cada acción.

/** Cancela el Turno pendiente o aceptado del Enlace; su horario queda libre. */
export async function cancelBookingByLinkAction(link: string) {
    return performClientBookingAction(
        () => getInjection('ICancelBookingByLinkController')({ link }),
        'No pudimos cancelar el turno. Intentá de nuevo.',
    );
}

/** Reagenda el Turno pendiente o aceptado del Enlace al Horario reservable `startsAt` (instante ISO). */
export async function rescheduleBookingByLinkAction(link: string, startsAt: string) {
    return performClientBookingAction(
        () => getInjection('IRescheduleBookingByLinkController')({ link, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}
