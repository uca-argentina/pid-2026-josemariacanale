'use server';

import { getInjection } from '@/di/container';
import { BookingAlreadyRatedError } from '@/src/entities/errors/booking';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { performClientBookingAction } from '@/app/_components/client-booking/perform-client-booking-action';

// El Enlace del Turno es la credencial (ADR 0022): sin Sesión ni acceso, viaja como parámetro en cada acción.

/** Cancela el Turno pendiente o aceptado del Enlace; su horario queda libre. `reason` es el Motivo de cancelación, opcional. */
export async function cancelBookingByLinkAction(link: string, reason?: string) {
    return performClientBookingAction(
        () => getInjection('ICancelBookingByLinkController')({ link, reason }),
        'No pudimos cancelar el turno. Intentá de nuevo.',
    );
}

/** Paga la Seña del Turno pendiente o aceptado del Enlace (simulado: Agendic no cobra). */
export async function payDepositByLinkAction(link: string) {
    return performClientBookingAction(
        () => getInjection('IPayDepositByLinkController')({ link }),
        'No pudimos pagar la seña. Intentá de nuevo.',
    );
}

const EMPLOYEE_NO_SHOW_ERRORS: Record<string, string> = {
    'Turno is not booked': 'El turno no está aceptado, así que no se puede marcar la Ausencia del Anfitrión.',
    'Turno has not started yet': 'El turno todavía no empezó.',
    'Employee no-show window closed': 'Ya pasó el plazo para marcar la Ausencia del Anfitrión.',
    'Turno has an Ausencia': 'El turno ya tiene una Ausencia del Invitado marcada.',
    'Employee no-show already marked': 'Ya marcaste la Ausencia del Anfitrión.',
    'Employee no-show not allowed for this Turno': 'No se puede marcar la Ausencia del Anfitrión en este turno.',
};

/** Marca la Ausencia del Anfitrión del Turno del Enlace: el Cliente avisa que quien lo atiende no vino. */
export async function markEmployeeNoShowByLinkAction(link: string) {
    return performClientBookingAction(
        () => getInjection('IMarkEmployeeNoShowByLinkController')({ link }),
        'No pudimos marcar la Ausencia del Anfitrión. Intentá de nuevo.',
        (message) => EMPLOYEE_NO_SHOW_ERRORS[message],
    );
}

/** Reagenda el Turno pendiente o aceptado del Enlace al Horario reservable `startsAt` (instante ISO). */
export async function rescheduleBookingByLinkAction(link: string, startsAt: string) {
    return performClientBookingAction(
        () => getInjection('IRescheduleBookingByLinkController')({ link, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}

/**
 * Califica el Turno del Enlace de 1 a 5, con un comentario opcional. Si el Turno ya tenía Calificación (409), devuelve el Turno
 * recargado para mostrarla.
 */
export async function rateBookingByLinkAction(link: string, score: number, comment?: string) {
    let reloaded: ClientBooking | undefined;
    const result = await performClientBookingAction(
        async () => {
            try {
                return await getInjection('IRateBookingByLinkController')({ link, score, comment });
            } catch (error) {
                if (!(error instanceof BookingAlreadyRatedError)) throw error;
                reloaded = await getInjection('IGetBookingByLinkController')({ link });
                return reloaded;
            }
        },
        'No pudimos guardar tu calificación. Intentá de nuevo.',
        (message) => (message === 'Turno cannot be rated' ? 'Este turno no se puede calificar.' : undefined),
    );
    return reloaded ? { ok: false as const, message: 'Este Turno ya tiene una Calificación', booking: reloaded } : result;
}
