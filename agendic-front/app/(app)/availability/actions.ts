'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AvailabilityInUseError, AvailabilityRuleError } from '@/src/entities/errors/availability';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { OverrideConflictError, OverrideRuleError } from '@/src/entities/errors/override';
import type { AvailabilityInterval } from '@/src/entities/models/availability';
import type { OverrideInterval } from '@/src/entities/models/override';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type AvailabilityActionResult = { ok: true } | { ok: false; message: string };

/**
 * Corre la acción y la traduce a `AvailabilityActionResult`. Refresca la página en un éxito y también
 * cuando las Horas laborables desaparecieron, así la lista muestra lo que hay en el back. El
 * `message` del 422 y del 409 es el del back (las Franjas inválidas, la predeterminada, cuántos
 * Servicios la usan) y sale tal cual.
 */
async function perform(
    run: () => Promise<void>,
    unexpected: string,
    notFound = 'Estas horas laborables ya no existen. Actualizamos la lista.',
): Promise<AvailabilityActionResult> {
    try {
        await run();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (
            error instanceof AvailabilityRuleError ||
            error instanceof AvailabilityInUseError ||
            error instanceof OverrideRuleError ||
            error instanceof OverrideConflictError
        )
            return { ok: false, message: error.message };
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: notFound };
        }
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}

/** Crea Horas laborables del Empleado con nombre y Franjas. */
export async function createAvailabilityAction(employeeId: number, name: string, intervals: AvailabilityInterval[]) {
    return perform(
        () => getInjection('ICreateAvailabilityController')({ employeeId, name, intervals }),
        'No pudimos crear las horas laborables. Intentá de nuevo.',
    );
}

/**
 * Guarda el nombre y el set entero de Franjas; con `makeDefault`, después las marca predeterminadas
 * (si el primer paso falla, no se marcan).
 */
export async function saveAvailabilityAction(input: {
    availabilityId: number;
    name: string;
    intervals: AvailabilityInterval[];
    makeDefault: boolean;
}) {
    const { makeDefault, ...changes } = input;
    return perform(async () => {
        await getInjection('IUpdateAvailabilityController')(changes);
        if (makeDefault) await getInjection('IMakeAvailabilityDefaultController')({ availabilityId: input.availabilityId });
    }, 'No pudimos guardar las horas laborables. Intentá de nuevo.');
}

/** Marca las Horas laborables como predeterminadas; las anteriores se desmarcan solas. */
export async function makeAvailabilityDefaultAction(availabilityId: number) {
    return perform(
        () => getInjection('IMakeAvailabilityDefaultController')({ availabilityId }),
        'No pudimos marcar las horas laborables como predeterminadas. Intentá de nuevo.',
    );
}

/** Borra las Horas laborables: el back no deja si son las predeterminadas o si las usa algún Servicio. */
export async function deleteAvailabilityAction(availabilityId: number) {
    return perform(
        () => getInjection('IDeleteAvailabilityController')({ availabilityId }),
        'No pudimos eliminar las horas laborables. Intentá de nuevo.',
    );
}

const EMPLOYEE_GONE = 'Este Empleado ya no existe. Actualizamos la página.';

/**
 * Anula las fechas del Empleado con las mismas Franjas (`[]` = día libre) y, si se pasa, la Cobertura
 * de un compañero. El `message` del 422 y del 409 es el del back y sale tal cual; si falla una fecha,
 * las anteriores ya quedaron guardadas y la página se refresca para mostrarlas.
 */
export async function setOverridesAction(input: {
    employeeId: number;
    dates: string[];
    intervals: OverrideInterval[];
    coveredByEmployeeId?: number;
}) {
    const result = await perform(
        () => getInjection('ISetOverridesController')(input),
        'No pudimos guardar la anulación. Intentá de nuevo.',
        EMPLOYEE_GONE,
    );
    if (!result.ok && input.dates.length > 1) refresh();
    return result;
}

/** Saca la Anulación de la fecha: ese día vuelve al horario semanal. */
export async function removeOverrideAction(employeeId: number, date: string) {
    return perform(
        () => getInjection('IRemoveOverrideController')({ employeeId, date }),
        'No pudimos quitar la anulación. Intentá de nuevo.',
        EMPLOYEE_GONE,
    );
}
