'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

// El enlace de la Anotación es la credencial: sin Sesión ni acceso, viaja como parámetro (ADR 0034).

export type LeaveWaitlistResult = { ok: true } | { ok: false; message: string };

/** Saca al Cliente de la Lista de espera de la Anotación del enlace. Salir de nuevo no es un error. */
export async function leaveWaitlistAction(link: string): Promise<LeaveWaitlistResult> {
    try {
        await getInjection('ILeaveWaitlistController')({ link });
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof NotFoundError || error instanceof InputParseError) return { ok: false, message: 'Esta anotación ya no existe.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos sacarte de la Lista de espera. Intentá de nuevo.' };
    }
}
