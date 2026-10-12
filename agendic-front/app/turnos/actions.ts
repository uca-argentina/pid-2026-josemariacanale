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

/** Paga la Seña del Turno pendiente o aceptado del Enlace (simulado: Agendic no cobra). */
export async function payDepositByLinkAction(link: string) {
    return performClientBookingAction(
        () => getInjection('IPayDepositByLinkController')({ link }),
        'No pudimos pagar la seña. Intentá de nuevo.',
    );
}

const EMPLOYEE_NO_SHOW_ERRORS: Record<string, string> = {
    'Turno is not booked': 'El turno no está aceptado, así que no se puede marcar la falta.',
    'Turno has not started yet': 'El turno todavía no empezó.',
    'Employee no-show window closed': 'Ya pasó el plazo para marcar la falta.',
    'Turno has an Ausencia': 'El turno ya tiene una ausencia marcada.',
    'Employee no-show already marked': 'Ya marcaste que no vino.',
    'Employee no-show not allowed for this Turno': 'No se puede marcar la falta en este turno.',
};

/** Marca la Falta del Empleado del Turno del Enlace: el Cliente avisa que el Empleado no vino. */
export async function markEmployeeNoShowByLinkAction(link: string) {
    return performClientBookingAction(
        () => getInjection('IMarkEmployeeNoShowByLinkController')({ link }),
        'No pudimos marcar la falta. Intentá de nuevo.',
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
