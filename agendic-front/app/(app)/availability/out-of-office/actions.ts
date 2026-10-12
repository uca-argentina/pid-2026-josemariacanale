'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import type { SaveOutOfOffice } from '@/src/entities/models/out-of-office';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type OutOfOfficeActionResult = { ok: true } | { ok: false; message: string };

/**
 * Corre la acción y la traduce a `OutOfOfficeActionResult`. Refresca la página en un éxito y también cuando el
 * período ya no existe, así la lista muestra lo que hay en el back. El `message` del 422 y del 409 es el del
 * back (fin anterior al inicio, fechas repetidas) y sale tal cual.
 */
async function perform(run: () => Promise<void>, unexpected: string): Promise<OutOfOfficeActionResult> {
    try {
        await run();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof OutOfOfficeRuleError || error instanceof OutOfOfficeConflictError) {
            return { ok: false, message: error.message };
        }
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: 'Este período ya no existe. Actualizamos la lista.' };
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
