'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { AvailabilityOverride, TimeRange } from '@/src/entities/models/availability';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type AvailabilityActionResult = { ok: true } | { ok: false; message: string };

/**
 * Corre la acción y la traduce a `AvailabilityActionResult`. Refresca la página en un éxito y también
 * cuando las Horas laborables desaparecieron, así la lista muestra lo que hay en el back. El
 * `message` del 422 es el del back (las Franjas inválidas, la predeterminada, los Servicios que la
 * usan) y sale tal cual.
 */
async function perform(run: () => Promise<void>, unexpected: string): Promise<AvailabilityActionResult> {
    try {
        await run();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof AvailabilityRuleError) return { ok: false, message: error.message };
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: 'Estas horas laborables ya no existen. Actualizamos la lista.' };
        }
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}

/** Crea Horas laborables del Usuario con nombre y zona horaria. */
export async function createAvailabilityAction(name: string, timeZone: string) {
    return perform(
        () => getInjection('ICreateAvailabilityController')({ name, timeZone }),
        'No pudimos crear las horas laborables. Intentá de nuevo.',
    );
}

/**
 * Guarda nombre, zona horaria, Franjas y Anulaciones enteros; con `makeDefault`, después las marca
 * predeterminadas (si el primer paso falla, no se marcan). Si solo falla el segundo, el mensaje dice que
 * lo demás quedó guardado: volver a guardar repite los dos pasos sin perder nada.
 */
export async function saveAvailabilityAction(input: {
    availabilityId: number;
    name: string;
    timeZone: string;
    schedule: TimeRange[][];
    overrides: AvailabilityOverride[];
    makeDefault: boolean;
}) {
    const { makeDefault, ...changes } = input;
    const saved = await perform(
        () => getInjection('IUpdateAvailabilityController')(changes),
        'No pudimos guardar las horas laborables. Intentá de nuevo.',
    );
    if (!saved.ok || !makeDefault) return saved;
    return perform(
        () => getInjection('IMakeAvailabilityDefaultController')({ availabilityId: input.availabilityId }),
        'Guardamos los cambios, pero no pudimos marcarlas como predeterminadas. Intentá de nuevo.',
    );
}

/** Marca las Horas laborables como predeterminadas; las anteriores se desmarcan solas. */
export async function makeAvailabilityDefaultAction(availabilityId: number) {
    return perform(
        () => getInjection('IMakeAvailabilityDefaultController')({ availabilityId }),
        'No pudimos marcar las horas laborables como predeterminadas. Intentá de nuevo.',
    );
}

/** Borra las Horas laborables: el back no deja si son las predeterminadas o si un Servicio se atiende con ellas. */
export async function deleteAvailabilityAction(availabilityId: number) {
    return perform(
        () => getInjection('IDeleteAvailabilityController')({ availabilityId }),
        'No pudimos eliminar las horas laborables. Intentá de nuevo.',
    );
}
