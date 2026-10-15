'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { CANCELLATION_REASON_TOO_LONG } from '@/app/_components/cancellation-reason';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { BookingNotAllowedError, BookingStateError, CancellationReasonTooLongError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import type { DI_RETURN_TYPES } from '@/di/types';
import { TIME_ZONE } from '@/app/(app)/_components/booking-format';
import { HISTORY_LOAD_ERROR } from './_components/booking-helpers';
import type { Preferences } from '@/src/entities/models/user';
import { BookingNotAllowedError, BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';

import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

/**
 * Lo que la UI recibe de una acción; `slotTaken` marca el 409 y el 422 de horario no disponible de Reagendar, que el
 * Empleado resuelve eligiendo otro horario, y `field: 'reason'` pone el mensaje bajo el campo del Motivo de cancelación.
 */
export type BookingActionResult =
    | { ok: true; bookingId?: number }
    | { ok: false; message: string; slotTaken?: true; field?: 'reason' };

/**
 * Corre la acción y la traduce a `BookingActionResult`. Refresca la página en un éxito y también
 * cuando el Turno cambió o desapareció, así la lista muestra lo que hay en el back.
 */
async function perform(run: () => Promise<{ id: number } | void>, unexpected: string): Promise<BookingActionResult> {
    try {
        const created = await run();
        refresh();
        return created ? { ok: true, bookingId: created.id } : { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof CancellationReasonTooLongError) return { ok: false, field: 'reason', message: CANCELLATION_REASON_TOO_LONG };
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

/** Rechaza un Turno pendiente; `reason` es el Motivo de cancelación, opcional. */
export async function rejectBookingAction(bookingId: number, reason?: string) {
    return perform(() => getInjection('IRejectBookingController')({ bookingId, reason }), 'No pudimos rechazar el turno. Intentá de nuevo.');
}

/** Cancela un Turno aceptado; `reason` es el Motivo de cancelación, opcional. */
export async function cancelBookingAction(bookingId: number, reason?: string) {
    return perform(() => getInjection('ICancelBookingController')({ bookingId, reason }), 'No pudimos cancelar el turno. Intentá de nuevo.');
}

/** Reagenda un Turno aceptado al Horario reservable `startsAt` (instante ISO). Reagendar lo reemplaza (ADR 0031): `bookingId` es el `id` del Turno nuevo. */
export async function rescheduleBookingAction(bookingId: number, startsAt: string) {
    return perform(
        () => getInjection('IRescheduleBookingController')({ bookingId, startsAt }),
        'No pudimos reagendar el turno. Intentá de nuevo.',
    );
}

/** Marca la Ausencia del Invitado de un Turno aceptado cuyo horario ya pasó. */
export async function markBookingNoShowAction(bookingId: number) {
    return perform(
        () => getInjection('IMarkBookingNoShowController')({ bookingId }),
        'No pudimos marcar la Ausencia del Invitado. Intentá de nuevo.',
    );
}

/** Desmarca la Ausencia del Invitado de un Turno; vale en cualquier momento. */
export async function unmarkBookingNoShowAction(bookingId: number) {
    return perform(
        () => getInjection('IUnmarkBookingNoShowController')({ bookingId }),
        'No pudimos desmarcar la Ausencia del Invitado. Intentá de nuevo.',
    );
}

/** El Historial del Turno ya armado para el panel lateral, o el mensaje de por qué no se pudo cargar. */
export type BookingHistoryResult =
    | { ok: true; entries: Awaited<ReturnType<DI_RETURN_TYPES['IGetBookingHistoryController']>> }
    | { ok: false; message: string };

/**
 * El Historial del Turno, con las fechas en la zona del panel y la hora en el formato de las Preferencias. No refresca la página: es una lectura. Un Turno que ya no
 * es del Usuario o no existe no se reporta; cualquier otro error sí.
 */
export async function getBookingHistoryAction(bookingId: number, timeFormat: Preferences['timeFormat']): Promise<BookingHistoryResult> {
    try {
        return { ok: true, entries: await getInjection('IGetBookingHistoryController')({ bookingId, timeZone: TIME_ZONE, timeFormat }) };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (!(error instanceof NotFoundError || error instanceof BookingNotAllowedError)) getInjection('ICrashReporterService').report(error);
        return { ok: false, message: HISTORY_LOAD_ERROR };
    }
}
