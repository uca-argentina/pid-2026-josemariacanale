'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { LeftOutsideBookingsChangedError, OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import type { SetHolidayCountry, ToggleHoliday } from '@/src/entities/models/holiday';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type OutOfOfficeActionResult = { ok: true } | { ok: false; message: string };

/** La escritura chocó con el 409 de Turnos: la lista de Turnos que quedan afuera cambió y hay que mostrarla de nuevo. */
export type LeftOutChangedResult = { ok: false; leftOutChanged: true };

/**
 * Corre la acción y la traduce: el valor en un éxito, o el fallo con el mensaje para el Usuario. Refresca la
 * página cuando el período ya no existe, así la lista muestra lo que hay en el back, pero no en un éxito:
 * eso lo decide quien llama. El `message` del 422 y del 409 es el del back (fin anterior al inicio, fechas
 * repetidas, Días festivos no configurados) y sale tal cual. El 409 de Turnos no lleva mensaje.
 */
async function settle<T>(
    run: () => Promise<T>,
    unexpected: string,
    notFound = 'Este período ya no existe. Actualizamos la lista.',
): Promise<{ ok: true; value: T } | { ok: false; message: string } | LeftOutChangedResult> {
    try {
        return { ok: true, value: await run() };
    } catch (error) {
        if (error instanceof LeftOutsideBookingsChangedError) return { ok: false, leftOutChanged: true };
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (
            error instanceof OutOfOfficeRuleError ||
            error instanceof OutOfOfficeConflictError ||
            error instanceof HolidaysNotConfiguredError
        ) {
            return { ok: false, message: error.message };
        }
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: notFound };
        }
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}

/** Como `settle`, para las acciones que no esperan el 409 de Turnos: refresca la página en un éxito. */
async function perform(
    run: () => Promise<unknown>,
    unexpected: string,
    notFound?: string,
): Promise<OutOfOfficeActionResult> {
    const result = await settle(run, unexpected, notFound);
    if (result.ok) {
        refresh();
        return { ok: true };
    }
    return 'message' in result ? result : { ok: false, message: unexpected };
}

/** Lo que devuelve la vista previa: los Turnos que quedan afuera, o el mensaje para el Usuario. */
export type PreviewOutOfOfficeResult = { ok: true; bookings: LeftOutsideBooking[] } | { ok: false; message: string };

/** Lo que devuelve crear: cuántos Turnos canceló, el mensaje para el Usuario, o que la lista de Turnos cambió. */
export type CreateOutOfOfficeResult = { ok: true; cancelledBookings: number } | { ok: false; message: string } | LeftOutChangedResult;

/** Los Turnos que crear este período Fuera de la oficina dejaría afuera. No guarda ni refresca nada. */
export async function previewOutOfOfficeAction(input: SaveOutOfOffice): Promise<PreviewOutOfOfficeResult> {
    const result = await settle(
        () => getInjection('IPreviewOutOfOfficeController')(input),
        'No pudimos revisar tus Turnos. Intentá de nuevo.',
    );
    if (result.ok) return { ok: true, bookings: result.value };
    return 'message' in result ? result : { ok: false, message: 'No pudimos revisar tus Turnos. Intentá de nuevo.' };
}

/**
 * Crea un período Fuera de la oficina del Usuario y cancela los Turnos de `cancelBookingIds`. Con el 409 de
 * Turnos responde `leftOutChanged` y no refresca la página: nada se guardó.
 */
export async function createOutOfOfficeAction(input: SaveOutOfOffice, cancelBookingIds?: number[]): Promise<CreateOutOfOfficeResult> {
    const result = await settle(
        () => getInjection('ICreateOutOfOfficeController')({ ...input, cancelBookingIds }),
        'No pudimos crear el período. Intentá de nuevo.',
    );
    if (!result.ok) return result;
    refresh();
    return { ok: true, cancelledBookings: result.value.cancelledBookings };
}

/** Los Turnos que editar este período Fuera de la oficina dejaría afuera. No guarda nada; ante un 404 refresca la página. */
export async function previewUpdateOutOfOfficeAction(outOfOfficeId: number, input: SaveOutOfOffice): Promise<PreviewOutOfOfficeResult> {
    const unexpected = 'No pudimos revisar tus Turnos. Intentá de nuevo.';
    const result = await settle(() => getInjection('IPreviewUpdateOutOfOfficeController')({ outOfOfficeId, ...input }), unexpected);
    if (result.ok) return { ok: true, bookings: result.value };
    return 'message' in result ? result : { ok: false, message: unexpected };
}

/**
 * Guarda los datos de un período Fuera de la oficina y cancela los Turnos de `cancelBookingIds`. Con el 409 de
 * Turnos responde `leftOutChanged` y no refresca la página: nada se guardó.
 */
export async function updateOutOfOfficeAction(
    outOfOfficeId: number,
    input: SaveOutOfOffice,
    cancelBookingIds?: number[],
): Promise<CreateOutOfOfficeResult> {
    const result = await settle(
        () => getInjection('IUpdateOutOfOfficeController')({ outOfOfficeId, ...input, cancelBookingIds }),
        'No pudimos guardar el período. Intentá de nuevo.',
    );
    if (!result.ok) return result;
    refresh();
    return { ok: true, cancelledBookings: result.value.cancelledBookings };
}

/** Borra un período Fuera de la oficina. */
export async function deleteOutOfOfficeAction(outOfOfficeId: number) {
    return perform(
        () => getInjection('IDeleteOutOfOfficeController')({ outOfOfficeId }),
        'No pudimos borrar el período. Intentá de nuevo.',
    );
}

/** Cambia el país de los Días festivos del Usuario (`null` lo saca). */
export async function setHolidayCountryAction(input: SetHolidayCountry) {
    return perform(
        () => getInjection('ISetHolidayCountryController')(input),
        'No pudimos cambiar el país. Intentá de nuevo.',
    );
}

/** Prende o apaga un Día festivo del Usuario. */
export async function toggleHolidayAction(input: ToggleHoliday) {
    return perform(
        () => getInjection('IToggleHolidayController')(input),
        'No pudimos guardar el cambio. Intentá de nuevo.',
        'Este Día festivo ya no existe. Actualizamos la lista.',
    );
}
