'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import type { SetHolidayCountry, ToggleHoliday } from '@/src/entities/models/holiday';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type OutOfOfficeActionResult = { ok: true } | { ok: false; message: string };

/**
 * Corre la acción y la traduce a `OutOfOfficeActionResult`. Refresca la página en un éxito y también cuando el
 * período ya no existe, así la lista muestra lo que hay en el back. El `message` del 422 y del 409 es el del
 * back (fin anterior al inicio, fechas repetidas, Días festivos no configurados) y sale tal cual.
 */
async function perform(
    run: () => Promise<unknown>,
    unexpected: string,
    notFound = 'Este período ya no existe. Actualizamos la lista.',
): Promise<OutOfOfficeActionResult> {
    try {
        await run();
        refresh();
        return { ok: true };
    } catch (error) {
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

/** Crea un período Fuera de la oficina del Usuario. */
export async function createOutOfOfficeAction(input: SaveOutOfOffice) {
    return perform(() => getInjection('ICreateOutOfOfficeController')(input), 'No pudimos crear el período. Intentá de nuevo.');
}

/** Guarda los datos de un período Fuera de la oficina. */
export async function updateOutOfOfficeAction(outOfOfficeId: number, input: SaveOutOfOffice) {
    return perform(
        () => getInjection('IUpdateOutOfOfficeController')({ outOfOfficeId, ...input }),
        'No pudimos guardar el período. Intentá de nuevo.',
    );
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
