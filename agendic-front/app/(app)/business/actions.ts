'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AlreadyOwnerError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';

export type CreateBusinessResult = { ok: true; failedEmployees: string[] } | { ok: false; message: string };

// Crear Negocio y después mandar las Invitaciones del wizard. El back no las recibe juntas: si falla
// una, el Negocio ya existe y el Dueño la manda después desde Empleados.
export async function createBusinessAction(
    payload: unknown,
    emails: string[],
): Promise<CreateBusinessResult> {
    let business;
    try {
        business = await getInjection('ICreateBusinessController')(payload);
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof AlreadyOwnerError) {
            refresh(); // la página pasa a mostrar el Negocio que ya tiene
            return { ok: false, message: 'Ya tenés un Negocio.' };
        }
        if (error instanceof SlugTakenError) return { ok: false, message: 'Esa dirección ya está en uso.' };
        if (error instanceof InvalidSlugError) return { ok: false, message: 'El Enlace de reserva no es válido.' };
        // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos crear tu Negocio. Intentá de nuevo.' };
    }

    const failedEmployees: string[] = [];
    for (const email of emails) {
        try {
            await getInjection('IAddEmployeeController')({ email, businessId: business.id });
        } catch (error) {
            unstable_rethrow(error);
            getInjection('ICrashReporterService').report(error);
            failedEmployees.push(email);
        }
    }
    refresh();
    return { ok: true, failedEmployees };
}

export type UpdateBusinessResult =
    | { ok: true; business: { id: number; name: string; description: string; slug: string } }
    | { ok: false; message: string; field?: 'slug' };

export async function updateBusinessAction(payload: unknown): Promise<UpdateBusinessResult> {
    try {
        const business = await getInjection('IUpdateBusinessController')(payload);
        refresh();
        return { ok: true, business };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof SlugTakenError) return { ok: false, field: 'slug', message: 'Esa dirección ya está en uso.' };
        if (error instanceof InvalidSlugError) return { ok: false, field: 'slug', message: 'El Enlace de reserva no es válido.' };
        // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos guardar los cambios. Intentá de nuevo.' };
    }
}
