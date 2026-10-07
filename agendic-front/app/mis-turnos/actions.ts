'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import { BookingStateError, ClientAccessExpiredError, InvalidVerificationCodeError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

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

export type ClientBooking = Awaited<ReturnType<DI_RETURN_TYPES['IListClientBookingsController']>>[number];

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

/** `slotTaken` marca el 409 y el 422 de horario no disponible, que se resuelven eligiendo otro horario. */
export type ClientBookingActionResult =
    | { ok: true; booking: ClientBooking }
    | { ok: false; expired: boolean; message: string; slotTaken?: true };

async function perform(run: () => Promise<ClientBooking>, unexpected: string): Promise<ClientBookingActionResult> {
    try {
        return { ok: true, booking: await run() };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof ClientAccessExpiredError) return { ok: false, expired: true, message: 'Tu acceso venció. Pedí un código nuevo.' };
        if (error instanceof SlotTakenError) return { ok: false, expired: false, slotTaken: true, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        if (error instanceof SlotUnavailableError)
            return { ok: false, expired: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro.' };
        if (error instanceof NotFoundError) return { ok: false, expired: false, message: 'Este turno ya no existe.' };
        if (error instanceof BookingStateError) return { ok: false, expired: false, message: 'El turno ya no se puede cambiar.' };
        if (error instanceof InputParseError) return { ok: false, expired: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, expired: false, message: unexpected };
    }
}

/** Cancela un Turno pendiente o aceptado; su horario queda libre. */
export async function cancelClientBookingAction(access: string, bookingId: number) {
    return perform(
        () => getInjection('ICancelClientBookingController')({ access, bookingId }),
        'No pudimos cancelar el turno. Intentá de nuevo.',
    );
}

/** Reagenda un Turno pendiente o aceptado al Horario reservable `startsAt` (instante ISO). */
export async function rescheduleClientBookingAction(access: string, bookingId: number, startsAt: string) {
    return perform(
        () => getInjection('IRescheduleClientBookingController')({ access, bookingId, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}
