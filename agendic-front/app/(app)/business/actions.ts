'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';

export type UpdateBusinessResult =
    | { ok: true; business: { id: number; name: string; description: string; slug: string } }
    | { ok: false; message: string };

export async function updateBusinessAction(payload: unknown): Promise<UpdateBusinessResult> {
    try {
        const business = await getInjection('IUpdateBusinessController')(payload);
        return { ok: true, business };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof SlugTakenError) return { ok: false, message: 'Esa dirección ya está en uso.' };
        if (error instanceof InvalidSlugError) return { ok: false, message: 'El Enlace de reserva no es válido.' };
        // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos guardar los cambios. Intentá de nuevo.' };
    }
}
