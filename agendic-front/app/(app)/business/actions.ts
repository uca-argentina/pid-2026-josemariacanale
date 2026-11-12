'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { PICK_ADDRESS_MESSAGE } from '@/app/_components/business-schemas';
import { BRANCH_IMAGES_REJECTED } from './branch-images-messages';
import { AlreadyOwnerError, BranchImagesRejectedError, InvalidLocationError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';
import { InvitationNotAcceptableError } from '@/src/entities/errors/employee';

/** Lo que ve el Dueño cuando el back no deja usar el Enlace de reserva: en el alta, en la edición y al verificarlo on blur. */
const SLUG_TAKEN_MESSAGE = 'Esa dirección ya está en uso.';
const INVALID_SLUG_MESSAGE = 'El Enlace de reserva no es válido.';

/** `logoFailed`: el Logo no se pudo subir; el Negocio ya existe y el Dueño lo carga después. */
export type CreateBusinessResult =
    | { ok: true; failedEmployees: string[]; logoFailed: boolean }
    | { ok: false; message: string; field?: 'address' };

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
 * Crea el Negocio con su Sucursal y las imágenes de esa Sucursal en un solo pedido; después, de a una, manda las
 * Invitaciones y sube el Logo. Sin imágenes no llama al back: la Sucursal nunca nace sin una.
 *
 * Las Invitaciones y el Logo el back no los recibe con el alta: si fallan, el Negocio ya existe y el Dueño los carga
 * después desde Empleados o Sucursales.
 *
 * Un `payload` o `emails` que no sea JSON vuelve como `ok: false`, sin crear nada.
 *
 * @param form `payload` (JSON con Negocio y Sucursal), `emails` (JSON), `logo` (opcional) e `images` en orden
 */
export async function createBusinessAction(form: FormData): Promise<CreateBusinessResult> {
    const logo = form.get('logo');
    const images = form.getAll('images').filter((image): image is File => image instanceof File);
    if (images.length === 0) return { ok: false, message: 'Elegí al menos una imagen de la Sucursal.' };

    let emails: string[];
    let business;
    try {
        emails = parseJson<string[]>(form.get('emails') ?? '[]');
        business = await getInjection('ICreateBusinessController')({ ...parseJson<object>(form.get('payload')), images });
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof AlreadyOwnerError) {
            refresh(); // la página pasa a mostrar el Negocio que ya tiene
            return { ok: false, message: 'Ya tenés un Negocio.' };
        }
        if (error instanceof SlugTakenError) return { ok: false, message: SLUG_TAKEN_MESSAGE };
        if (error instanceof InvalidSlugError) return { ok: false, message: INVALID_SLUG_MESSAGE };
        // The form only builds a punto from a suggestion, so a 400 about it means picking one again.
        if (error instanceof InvalidLocationError) return { ok: false, field: 'address', message: PICK_ADDRESS_MESSAGE };
        if (error instanceof BranchImagesRejectedError) return { ok: false, message: BRANCH_IMAGES_REJECTED[error.reason] };
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

    const logoFailed =
        logo instanceof File && !(await attempt(() => getInjection('IUploadBusinessLogoController')({ businessId: business.id, file: logo })));

    refresh();
    return { ok: true, failedEmployees, logoFailed };
}

/** Lo que muestra el campo Enlace de reserva según por qué el back no lo deja usar. Las reservadas salen como "en uso", igual que en el alta. */
const SLUG_UNAVAILABLE_MESSAGES = {
    taken: SLUG_TAKEN_MESSAGE,
    reserved: SLUG_TAKEN_MESSAGE,
    invalid: INVALID_SLUG_MESSAGE,
} as const;

export type CheckSlugResult = { ok: true } | { ok: false; message: string };

/**
 * Verifica el Enlace de reserva al salir del campo, en Crear y Editar Negocio. Si el chequeo falla (red, back caído)
 * no bloquea al Dueño: el alta y la edición lo vuelven a verificar.
 */
export async function checkSlugAction(slug: string): Promise<CheckSlugResult> {
    try {
        const result = await getInjection('ICheckSlugAvailabilityController')(slug);
        return result.available ? { ok: true } : { ok: false, message: SLUG_UNAVAILABLE_MESSAGES[result.reason] };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return { ok: true };
    }
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
        if (error instanceof SlugTakenError) return { ok: false, field: 'slug', message: SLUG_TAKEN_MESSAGE };
        if (error instanceof InvalidSlugError) return { ok: false, field: 'slug', message: INVALID_SLUG_MESSAGE };
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
