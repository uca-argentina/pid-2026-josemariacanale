'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { BookingNotAllowedError, BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

/** Lo que la UI recibe de una acción; `slotTaken` marca el 409 y el 422 de horario no disponible de Reagendar, que el Empleado resuelve eligiendo otro horario. */
export type BookingActionResult = { ok: true } | { ok: false; message: string; slotTaken?: true };

/**
 * Corre la acción y la traduce a `BookingActionResult`. Refresca la página en un éxito y también
 * cuando el Turno cambió o desapareció, así la lista muestra lo que hay en el back.
 */
async function perform(run: () => Promise<void>, unexpected: string): Promise<BookingActionResult> {
    try {
        await run();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof SlotTakenError) return { ok: false, slotTaken: true, message: 'Ese horario choca con otro turno tuyo. Elegí otro horario.' };
        if (error instanceof SlotUnavailableError) return { ok: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro horario.' };
        if (error instanceof BookingNotAllowedError) return { ok: false, message: 'Este turno no es tuyo.' };
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: 'Este turno ya no existe.' };
        }
        if (error instanceof BookingStateError) {
            refresh();
            return { ok: false, message: 'El turno cambió mientras tanto. Actualizamos la lista.' };
        }
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}

/** Acepta un Turno pendiente. */
export async function acceptBookingAction(bookingId: number) {
    return perform(() => getInjection('IAcceptBookingController')({ bookingId }), 'No pudimos aceptar el turno. Intentá de nuevo.');
}

/** Rechaza un Turno pendiente. */
export async function rejectBookingAction(bookingId: number) {
    return perform(() => getInjection('IRejectBookingController')({ bookingId }), 'No pudimos rechazar el turno. Intentá de nuevo.');
}

/** Cancela un Turno aceptado. */
export async function cancelBookingAction(bookingId: number) {
    return perform(() => getInjection('ICancelBookingController')({ bookingId }), 'No pudimos cancelar el turno. Intentá de nuevo.');
}

/** Reagenda un Turno aceptado al Horario reservable `startsAt` (instante ISO). */
export async function rescheduleBookingAction(bookingId: number, startsAt: string) {
    return perform(
        () => getInjection('IRescheduleBookingController')({ bookingId, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}

/** Marca la Ausencia de un Turno aceptado cuyo horario ya pasó. */
export async function markBookingNoShowAction(bookingId: number) {
    return perform(
        () => getInjection('IMarkBookingNoShowController')({ bookingId }),
        'No pudimos marcar la ausencia. Intentá de nuevo.',
    );
}
