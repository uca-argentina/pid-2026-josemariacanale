'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';
import type { AvailabilityOverride, TimeRange } from '@/src/entities/models/availability';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Lo que la UI recibe de una acción; el `message` se muestra tal cual. */
export type AvailabilityActionResult = { ok: true } | { ok: false; message: string };

/** La escritura chocó con el 409 de Turnos: la lista de Turnos que quedan afuera cambió y hay que mostrarla de nuevo. */
export type LeftOutChangedResult = { ok: false; leftOutChanged: true };

/**
 * Corre la acción y la traduce: el valor en un éxito, o el fallo con el mensaje para el Usuario. Refresca la
 * página cuando las Horas laborables desaparecieron, así la lista muestra lo que hay en el back, pero no en
 * un éxito: eso lo decide quien llama. El `message` del 422 es el del back (las Franjas inválidas, la
 * predeterminada, los Servicios que la usan) y sale tal cual. El 409 de Turnos no lleva mensaje.
 */
async function settle<T>(
    run: () => Promise<T>,
    unexpected: string,
): Promise<{ ok: true; value: T } | { ok: false; message: string } | LeftOutChangedResult> {
    try {
        return { ok: true, value: await run() };
    } catch (error) {
        if (error instanceof LeftOutsideBookingsChangedError) return { ok: false, leftOutChanged: true };
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

/** Como `settle`, para las acciones que no esperan el 409 de Turnos: refresca la página en un éxito. */
async function perform(run: () => Promise<unknown>, unexpected: string): Promise<AvailabilityActionResult> {
    const result = await settle(run, unexpected);
    if (result.ok) {
        refresh();
        return { ok: true };
    }
    return 'message' in result ? result : { ok: false, message: unexpected };
}

/** Crea Horas laborables del Usuario con nombre y zona horaria. */
export async function createAvailabilityAction(name: string, timeZone: string) {
    return perform(
        () => getInjection('ICreateAvailabilityController')({ name, timeZone }),
        'No pudimos crear las horas laborables. Intentá de nuevo.',
    );
}

/** El contenido entero de unas Horas laborables, como lo manda el editor. */
export type AvailabilityContent = {
    availabilityId: number;
    name: string;
    timeZone: string;
    schedule: TimeRange[][];
    overrides: AvailabilityOverride[];
};

/** Lo que devuelve la vista previa: los Turnos que quedan afuera, o el mensaje para el Usuario. */
export type PreviewAvailabilityResult = { ok: true; bookings: LeftOutsideBooking[] } | { ok: false; message: string };

/** Lo que devuelve guardar: cuántos Turnos canceló, el mensaje para el Usuario, o que la lista de Turnos cambió. */
export type SaveAvailabilityResult = { ok: true; cancelledBookings: number } | { ok: false; message: string } | LeftOutChangedResult;

/** Los Turnos que guardar este contenido dejaría afuera. No guarda nada; ante un 404 refresca la página. */
export async function previewAvailabilityAction(input: AvailabilityContent): Promise<PreviewAvailabilityResult> {
    const unexpected = 'No pudimos revisar tus Turnos. Intentá de nuevo.';
    const result = await settle(() => getInjection('IPreviewUpdateAvailabilityController')(input), unexpected);
    if (result.ok) return { ok: true, bookings: result.value };
    return 'message' in result ? result : { ok: false, message: unexpected };
}

/**
 * Guarda nombre, zona horaria, Franjas y Anulaciones enteros y cancela los Turnos de `cancelBookingIds`; con
 * `makeDefault`, después las marca predeterminadas (si el primer paso falla, no se marcan). Si solo falla el
 * segundo, el mensaje dice que lo demás quedó guardado: volver a guardar repite los dos pasos sin perder nada.
 * Con el 409 de Turnos responde `leftOutChanged` y no refresca la página: nada se guardó.
 */
export async function saveAvailabilityAction(
    input: AvailabilityContent & { makeDefault: boolean },
    cancelBookingIds?: number[],
): Promise<SaveAvailabilityResult> {
    const { makeDefault, ...changes } = input;
    const saved = await settle(
        () => getInjection('IUpdateAvailabilityController')({ ...changes, cancelBookingIds }),
        'No pudimos guardar las horas laborables. Intentá de nuevo.',
    );
    if (!saved.ok) return saved;
    refresh();
    if (makeDefault) {
        const marked = await perform(
            () => getInjection('IMakeAvailabilityDefaultController')({ availabilityId: input.availabilityId }),
            'Guardamos los cambios, pero no pudimos marcarlas como predeterminadas. Intentá de nuevo.',
        );
        if (!marked.ok) return marked;
    }
    return { ok: true, cancelledBookings: saved.value.cancelledBookings };
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
