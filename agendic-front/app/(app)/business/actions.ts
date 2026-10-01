'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AlreadyOwnerError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';
import { InvitationNotAcceptableError } from '@/src/entities/errors/employee';

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

/** Resultado de Aceptar o Rechazar una Invitación; `message` se muestra en el toast. */
export type AnswerInvitationResult = { ok: true } | { ok: false; message: string };

/**
 * Acepta la Invitación: el Usuario pasa a ser Empleado.
 *
 * El 422 del back (venció / ya es Empleado) vuelve con su mensaje, y se refresca porque la Invitación ya no se puede aceptar.
 */
export async function acceptInvitationAction(invitationId: number): Promise<AnswerInvitationResult> {
    try {
        await getInjection('IAcceptInvitationController')({ invitationId });
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InvitationNotAcceptableError) {
            refresh();
            return { ok: false, message: error.message };
        }
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos aceptar la invitación. Intentá de nuevo.' };
    }
}

/** Rechaza la Invitación del Usuario; la sección se refresca con las que quedan. */
export async function rejectInvitationAction(invitationId: number): Promise<AnswerInvitationResult> {
    try {
        await getInjection('IRejectInvitationController')({ invitationId });
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos rechazar la invitación. Intentá de nuevo.' };
    }
}
