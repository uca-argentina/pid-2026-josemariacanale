'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';
import { ServiceNameTakenError, ServiceSlugTakenError } from '@/src/entities/errors/service';

export type CreateServiceResult = { ok: true; name: string } | { ok: false; message: string; field?: 'name' | 'slug' };

/**
 * Nuevo y Duplicar: crea el Servicio y refresca la página, así aparece en su Sucursal con lo que devuelve el back.
 * Los 409 vuelven con el `message` del back, para mostrarlo bajo su campo.
 */
export async function createServiceAction(payload: unknown): Promise<CreateServiceResult> {
    try {
        const created = await getInjection('ICreateServiceController')(payload);
        refresh();
        return { ok: true, name: created.name };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof ServiceSlugTakenError) return { ok: false, field: 'slug', message: error.message };
        if (error instanceof ServiceNameTakenError) return { ok: false, field: 'name', message: error.message };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño del Negocio puede crear Servicios.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos crear el Servicio. Intentá de nuevo.' };
    }
}
