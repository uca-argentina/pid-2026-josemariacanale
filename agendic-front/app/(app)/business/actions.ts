'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AlreadyOwnerError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';
import { InvitationNotAcceptableError } from '@/src/entities/errors/employee';

/** `failedUploads` nombra lo que no se pudo subir (el Logo, imágenes): el Negocio ya existe y se carga después. */
export type CreateBusinessResult =
    | { ok: true; failedEmployees: string[]; failedUploads: string[] }
    | { ok: false; message: string };

/** @throws {InputParseError} el campo del formulario no es JSON */
function parseJson<T>(value: FormDataEntryValue | null): T {
    try {
        return JSON.parse(String(value));
    } catch (cause) {
        throw new InputParseError('Invalid form data', { cause });
    }
}

/** Corre un paso posterior a crear el Negocio: si falla lo reporta y sigue, devolviendo false. */
async function attempt(step: () => Promise<unknown>): Promise<boolean> {
    try {
        await step();
        return true;
    } catch (error) {
        unstable_rethrow(error);
        getInjection('ICrashReporterService').report(error);
        return false;
    }
}

/**
 * Crea el Negocio con su Sucursal y después, de a una, manda las Invitaciones, sube el Logo y las imágenes.
 *
 * El back no las recibe juntas: si algo falla, el Negocio ya existe y el Dueño lo carga después desde Empleados o
 * Sucursales. Las imágenes van en el orden elegido; el back agrega cada una al final, así que no hace falta reordenar.
 *
 * Un `payload` o `emails` que no sea JSON vuelve como `ok: false`, sin crear nada.
 *
 * @param form `payload` (JSON con Negocio y Sucursal), `emails` (JSON), `logo` (opcional) e `images` en orden
 */
export async function createBusinessAction(form: FormData): Promise<CreateBusinessResult> {
    const logo = form.get('logo');
    const images = form.getAll('images').filter((image): image is File => image instanceof File);

    let emails: string[];
    let business;
    try {
        emails = parseJson<string[]>(form.get('emails') ?? '[]');
        business = await getInjection('ICreateBusinessController')(parseJson(form.get('payload')));
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
        if (!(await attempt(() => getInjection('IAddEmployeeController')({ email, businessId: business.id })))) {
            failedEmployees.push(email);
        }
    }

    const failedUploads: string[] = [];
    if (logo instanceof File && !(await attempt(() => getInjection('IUploadBusinessLogoController')({ businessId: business.id, file: logo })))) {
        failedUploads.push('el Logo');
    }
    for (const file of images) {
        if (!(await attempt(() => getInjection('IUploadBranchImageController')({ branchId: business.branchId, file })))) {
            failedUploads.push(`la imagen ${file.name}`);
        }
    }

    refresh();
    return { ok: true, failedEmployees, failedUploads };
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
