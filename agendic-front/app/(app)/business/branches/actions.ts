'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { BranchImageLimitError, InvalidSlugError, LastBranchImageError, SlugTakenError } from '@/src/entities/errors/business';
import { CabinHasUpcomingBookingsError, CabinNameTakenError, InvalidCabinNameError } from '@/src/entities/errors/cabin';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';

/** `message` se muestra al Usuario; `field` lo pone bajo ese campo en vez de en un toast. */
export type BranchActionResult<T = undefined> =
    | { ok: true; data: T }
    | { ok: false; message: string; field?: 'slug' | 'name' };

/** Por qué no se puede borrar la única imagen de una Sucursal, si el back lo rechaza igual (otra pestaña desactualizada). */
const LAST_BRANCH_IMAGE_MESSAGE = 'La sucursal necesita al menos una imagen';

/** Por qué no se puede dar de baja una Cabina con Turnos futuros, con cuántos son. */
const upcomingBookingsMessage = (count: number) =>
    count === 1
        ? 'Esta Cabina tiene 1 Turno próximo. Reagendalo o cancelalo antes de darla de baja.'
        : `Esta Cabina tiene ${count} Turnos próximos. Reagendalos o cancelalos antes de darla de baja.`;

/**
 * Corre un controller y traduce sus errores a lo que muestra la página; refresca si salió bien.
 *
 * Una Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión. `unstable_rethrow` deja pasar el
 * control de flujo de Next (redirect, notFound, uso dinámico), que no es una falla.
 */
async function run<T>(fallback: string, work: () => Promise<T>): Promise<BranchActionResult<T>> {
    try {
        const data = await work();
        refresh();
        return { ok: true, data };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlugTakenError) return { ok: false, field: 'slug', message: 'Esa dirección ya está en uso.' };
        if (error instanceof InvalidSlugError) return { ok: false, field: 'slug', message: 'El Enlace de reserva no es válido.' };
        if (error instanceof CabinNameTakenError) return { ok: false, field: 'name', message: 'Ya hay una Cabina con ese nombre en esta Sucursal.' };
        if (error instanceof InvalidCabinNameError) return { ok: false, field: 'name', message: 'El nombre tiene que tener entre 1 y 60 caracteres.' };
        if (error instanceof CabinHasUpcomingBookingsError) return { ok: false, message: upcomingBookingsMessage(error.upcomingBookings) };
        if (error instanceof BranchImageLimitError) return { ok: false, message: error.message };
        if (error instanceof LastBranchImageError) return { ok: false, message: LAST_BRANCH_IMAGE_MESSAGE };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        // A 409 is a rule of the back, not a crash: nothing to report.
        if (error instanceof ApiRequestError && error.status === 409) return { ok: false, message: fallback };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: fallback };
    }
}

const fileOf = (form: FormData) => form.get('file');

/** Crea una Sucursal del Negocio; devuelve su id para subir las imágenes que el Dueño ya eligió. */
export async function createBranchAction(payload: unknown) {
    return run('No pudimos crear la Sucursal. Intentá de nuevo.', async () => {
        const branch = await getInjection('ICreateBranchController')(payload);
        return { id: branch.id };
    });
}

/** Guarda los cambios de una Sucursal; `description: null` le saca la descripción propia. */
export async function updateBranchAction(payload: unknown) {
    return run('No pudimos guardar los cambios. Intentá de nuevo.', () => getInjection('IUpdateBranchController')(payload));
}

/** Sube una imagen a la Sucursal; el archivo viaja en el campo `file` del `FormData`. */
export async function uploadBranchImageAction(branchId: number, form: FormData) {
    return run('No pudimos subir la imagen. Intentá de nuevo.', () =>
        getInjection('IUploadBranchImageController')({ branchId, file: fileOf(form) }),
    );
}

/** Borra una imagen de la Sucursal. */
export async function deleteBranchImageAction(branchId: number, imageId: number) {
    return run('No pudimos borrar la imagen. Intentá de nuevo.', () =>
        getInjection('IDeleteBranchImageController')({ branchId, imageId }),
    );
}

/** Guarda el orden nuevo de las imágenes de la Sucursal. */
export async function reorderBranchImagesAction(branchId: number, imageIds: number[]) {
    return run('No pudimos guardar el orden de las imágenes.', () =>
        getInjection('IReorderBranchImagesController')({ branchId, imageIds }),
    );
}

/** Sube el Logo del Negocio; el archivo viaja en el campo `file` del `FormData`. */
export async function uploadBusinessLogoAction(businessId: number, form: FormData) {
    return run('No pudimos subir el Logo. Intentá de nuevo.', () =>
        getInjection('IUploadBusinessLogoController')({ businessId, file: fileOf(form) }),
    );
}

/** Quita el Logo del Negocio. */
export async function deleteBusinessLogoAction(businessId: number) {
    return run('No pudimos quitar el Logo. Intentá de nuevo.', () =>
        getInjection('IDeleteBusinessLogoController')({ businessId }),
    );
}

/** Agrega una Cabina a la Sucursal. */
export async function createCabinAction(branchId: number, name: string) {
    return run('No pudimos agregar la Cabina. Intentá de nuevo.', () => getInjection('ICreateCabinController')({ branchId, name }));
}

/** Renombra una Cabina. */
export async function renameCabinAction(id: number, name: string) {
    return run('No pudimos renombrar la Cabina. Intentá de nuevo.', () => getInjection('IRenameCabinController')({ id, name }));
}

/** Da de baja una Cabina; si tiene Turnos futuros, el aviso dice cuántos son. */
export async function retireCabinAction(id: number) {
    return run('No pudimos dar de baja la Cabina. Intentá de nuevo.', () => getInjection('IRetireCabinController')({ id }));
}
