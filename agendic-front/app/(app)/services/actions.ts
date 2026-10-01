'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { LastEmployeeError } from '@/src/entities/errors/employee';
import {
    AvailabilityNotOfEmployeeError,
    EmployeeNotAssignableError,
    ServiceNameTakenError,
    ServiceSlugTakenError,
} from '@/src/entities/errors/service';

/** Lo que el diálogo de alta necesita para cerrar, o para mostrar el error bajo su campo o al pie. */
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
        if (error instanceof InputParseError || (error instanceof ApiRequestError && error.status === 400))
            return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño del Negocio puede crear Servicios.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos crear el Servicio. Intentá de nuevo.' };
    }
}

/** Lo que Guardar y el switch de ocultar necesitan para confirmar, o para mostrar el error bajo su campo o al pie. */
export type UpdateServiceResult =
    | { ok: true; name: string; hidden: boolean }
    | { ok: false; message: string; field?: 'name' | 'slug' };

/**
 * Guardar del detalle y el switch de ocultar de la lista y del detalle: cambia solo los campos que llegan y refresca la
 * página. Los 409 vuelven con el `message` del back, para mostrarlo bajo su campo.
 */
export async function updateServiceAction(payload: unknown): Promise<UpdateServiceResult> {
    try {
        const updated = await getInjection('IUpdateServiceController')(payload);
        refresh();
        return { ok: true, name: updated.name, hidden: updated.hidden };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof ServiceSlugTakenError) return { ok: false, field: 'slug', message: error.message };
        if (error instanceof ServiceNameTakenError) return { ok: false, field: 'name', message: error.message };
        if (error instanceof NotFoundError) return { ok: false, message: 'Este Servicio ya no existe.' };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof InputParseError || (error instanceof ApiRequestError && error.status === 400))
            return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño del Negocio puede editar sus Servicios.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos guardar el Servicio. Intentá de nuevo.' };
    }
}

/** Cuántos Turnos canceló la baja, o el mensaje para el Usuario. */
export type RetireServiceResult = { ok: true; cancelledBookings: number } | { ok: false; message: string };

/**
 * Dar de baja, desde la lista o desde el detalle. No refresca la página: el detalle del Servicio dado de baja daría no
 * encontrado, así que quien la llama vuelve a la lista o la refresca.
 */
export async function retireServiceAction(id: number): Promise<RetireServiceResult> {
    try {
        const { cancelledBookings } = await getInjection('IRetireServiceController')({ id });
        return { ok: true, cancelledBookings };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof NotFoundError) return { ok: false, message: 'Este Servicio ya no existe.' };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño del Negocio puede dar de baja sus Servicios.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos dar de baja el Servicio. Intentá de nuevo.' };
    }
}

/** El nombre del Servicio para confirmar, o el mensaje para el Usuario. */
export type AssignEmployeeResult = { ok: true; name: string } | { ok: false; message: string };

/**
 * Ofrecer un Servicio: para el propio Empleado del Usuario desde la lista o el detalle, o para otro Empleado del Staff
 * desde la sección Empleados del Dueño. Refresca la página, así se ve quién lo atiende ahora.
 */
export async function assignEmployeeAction(payload: { serviceId: number; employeeId: number }): Promise<AssignEmployeeResult> {
    try {
        const { name } = await getInjection('IAssignEmployeeController')(payload);
        refresh();
        return { ok: true, name };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof EmployeeNotAssignableError) return { ok: false, message: error.message };
        if (error instanceof NotFoundError) return { ok: false, message: 'El Servicio o el Empleado ya no existen.' };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño puede ofrecer un Servicio en nombre de otro Empleado.' };
        if (error instanceof ApiRequestError && error.status === 409)
            return { ok: false, message: 'Ese Empleado ya ofrece este Servicio.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos ofrecer el Servicio. Intentá de nuevo.' };
    }
}

/** Cuántos Turnos se cancelaron, o el mensaje para el Usuario. */
export type RemoveEmployeeResult = { ok: true; cancelledBookings: number } | { ok: false; message: string };

/**
 * Dejar de ofrecer un Servicio, para el propio Empleado o, desde el detalle, el Dueño por cualquier Empleado. No
 * refresca la página: un Empleado que deja un Servicio oculto ya no lo ve, y su detalle daría no encontrado; quien la
 * llama vuelve a la lista o la refresca. El 422 del último Empleado vuelve con el `message` del back.
 */
export async function removeEmployeeAction(payload: { serviceId: number; employeeId: number }): Promise<RemoveEmployeeResult> {
    try {
        const { cancelledBookings } = await getInjection('IRemoveEmployeeController')(payload);
        return { ok: true, cancelledBookings };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof LastEmployeeError) return { ok: false, message: error.message };
        if (error instanceof NotFoundError) return { ok: false, message: 'El Servicio o el Empleado ya no existen.' };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo el Dueño puede quitar a otro Empleado de un Servicio.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos dejar de ofrecer el Servicio. Intentá de nuevo.' };
    }
}

/** El nombre del Servicio para confirmar, o el mensaje para el Usuario. */
export type ChangeEmployeeAvailabilityResult = { ok: true; name: string } | { ok: false; message: string };

/**
 * El select de la pestaña Horas laborables: cambia la Availability con la que el propio Empleado del Usuario atiende el
 * Servicio y refresca la página. No toca sus Turnos ya tomados. El 422 y el 404 vuelven con el `message` del back.
 */
export async function changeEmployeeAvailabilityAction(payload: {
    serviceId: number;
    employeeId: number;
    availabilityId: number;
}): Promise<ChangeEmployeeAvailabilityResult> {
    try {
        const { name } = await getInjection('IChangeEmployeeAvailabilityController')(payload);
        refresh();
        return { ok: true, name };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof AvailabilityNotOfEmployeeError || error instanceof NotFoundError)
            return { ok: false, message: error.message };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof ApiRequestError && error.status === 403)
            return { ok: false, message: 'Solo podés elegir tus propias Horas laborables.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos cambiar las Horas laborables. Intentá de nuevo.' };
    }
}
