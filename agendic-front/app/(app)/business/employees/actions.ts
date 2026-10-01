'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { ApiRequestError, InputParseError } from '@/src/entities/errors/common';
import { AlreadyEmployeeError, InvitationNotPendingError, LastEmployeeError } from '@/src/entities/errors/employee';

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

/** Reenvía la Invitación pendiente y renueva su vencimiento. El 404 y el 422 del back refrescan la tabla: la Invitación ya no está. */
export async function resendInvitationAction(payload: unknown): Promise<EmployeeActionResult> {
    try {
        await getInjection('IResendInvitationController')(payload);
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InvitationNotPendingError || (error instanceof ApiRequestError && error.status === 404)) {
            refresh();
            return { ok: false, message: 'La Invitación ya no está pendiente.' };
        }
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos reenviar la invitación. Intentá de nuevo.' };
    }
}

/** Cancela la Invitación pendiente. El 404 y el 422 del back refrescan la tabla: la Invitación ya no está. */
export async function cancelInvitationAction(payload: unknown): Promise<EmployeeActionResult> {
    try {
        await getInjection('ICancelInvitationController')(payload);
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InvitationNotPendingError || (error instanceof ApiRequestError && error.status === 404)) {
            refresh();
            return { ok: false, message: 'La Invitación ya no está pendiente.' };
        }
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos cancelar la invitación. Intentá de nuevo.' };
    }
}
