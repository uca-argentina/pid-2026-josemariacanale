'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { BranchImageLimitError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { InputParseError } from '@/src/entities/errors/common';

/** `message` se muestra al Usuario; `field` lo pone bajo ese campo en vez de en un toast. */
export type BranchActionResult<T = undefined> =
    | { ok: true; data: T }
    | { ok: false; message: string; field?: 'slug' };

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
        if (error instanceof BranchImageLimitError) return { ok: false, message: error.message };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
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
