'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { performClientBookingAction } from '@/app/_components/client-booking/perform-client-booking-action';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { ClientAccessExpiredError, InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';

// Mis turnos es público y sin cookie (ADR 0022): el acceso vive en memoria en el navegador y viaja
// como parámetro en cada acción, nunca en una cookie ni en la Sesión.

export type OpenAccessResult = { ok: true; access: string } | { ok: false; message: string };

/** Cambia un Código de verificación vigente por un acceso de 15 minutos a Mis turnos. */
export async function openClientAccessAction(email: string, code: string): Promise<OpenAccessResult> {
    try {
        const { access } = await getInjection('IOpenClientAccessController')({ email, code });
        return { ok: true, access };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InvalidVerificationCodeError) return { ok: false, message: 'El código no es válido o venció.' };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá tus datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos validar el código. Intentá de nuevo.' };
    }
}

export type ListBookingsResult = { ok: true; bookings: ClientBooking[] } | { ok: false; expired: boolean; message: string };

/** Mis turnos del Cliente: todos sus Turnos, en cualquier Negocio o Servicio personal. */
export async function listClientBookingsAction(access: string): Promise<ListBookingsResult> {
    try {
        return { ok: true, bookings: await getInjection('IListClientBookingsController')({ access }) };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof ClientAccessExpiredError) return { ok: false, expired: true, message: 'Tu acceso venció. Pedí un código nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, expired: false, message: 'No pudimos cargar tus turnos. Intentá de nuevo.' };
    }
}

/** Cancela un Turno pendiente o aceptado; su horario queda libre. */
export async function cancelClientBookingAction(access: string, bookingId: number) {
    return performClientBookingAction(
        () => getInjection('ICancelClientBookingController')({ access, bookingId }),
        'No pudimos cancelar el turno. Intentá de nuevo.',
    );
}

/** Reagenda un Turno pendiente o aceptado al Horario reservable `startsAt` (instante ISO). */
export async function rescheduleClientBookingAction(access: string, bookingId: number, startsAt: string) {
    return performClientBookingAction(
        () => getInjection('IRescheduleClientBookingController')({ access, bookingId, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}
