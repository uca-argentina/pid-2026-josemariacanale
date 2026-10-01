'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';
import { AlreadyEmployeeError, LastEmployeeError } from '@/src/entities/errors/employee';

export type EmployeeActionResult = { ok: true } | { ok: false; message: string; field?: 'email' };

// Las dos refrescan la página: la tabla sale siempre de lo que devuelve el back.

export async function addEmployeeAction(payload: unknown): Promise<EmployeeActionResult> {
    try {
        await getInjection('IAddEmployeeController')(payload);
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof AlreadyEmployeeError) return { ok: false, message: 'Esa persona ya es Empleado de tu Negocio.', field: 'email' };
        // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos enviar la invitación. Intentá de nuevo.' };
    }
}

export async function retireEmployeeAction(payload: unknown): Promise<EmployeeActionResult> {
    try {
        await getInjection('IRetireEmployeeController')(payload);
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof LastEmployeeError)
            return { ok: false, message: 'Es el único Empleado de un Servicio. Sumá a otro a ese Servicio antes de darlo de baja.' };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos dar de baja al Empleado. Intentá de nuevo.' };
    }
}
