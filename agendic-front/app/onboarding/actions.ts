'use server';

import { getInjection } from '@/di/container';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';

export type CreateBusinessResult = { ok: true } | { ok: false; message: string };

export async function createBusinessAction(payload: unknown): Promise<CreateBusinessResult> {
    try {
        await getInjection('ICreateBusinessController')(payload);
        return { ok: true };
    } catch (error) {
        if (error instanceof SlugTakenError) return { ok: false, message: 'Esa dirección ya está en uso.' };
        if (error instanceof InvalidSlugError) return { ok: false, message: 'El Enlace de reserva no es válido.' };
        if (error instanceof UnauthenticatedError) return { ok: false, message: 'Tu sesión expiró. Volvé a iniciar sesión.' };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos crear tu Negocio. Intentá de nuevo.' };
    }
}
