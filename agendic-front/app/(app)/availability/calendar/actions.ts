'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { CALENDAR_CONNECT_FAILED_MESSAGE, CALENDAR_NOT_CONFIGURED_MESSAGE } from '@/app/(app)/_components/calendar-copy';
import { CalendarAlreadyConnectedError, CalendarNotConfiguredError } from '@/src/entities/errors/calendar';
import { NotFoundError } from '@/src/entities/errors/common';

/** Lo que devuelve conectar: a dónde llevar el navegador, o el mensaje para el Usuario (`notConfigured`: Google no está configurado). */
export type ConnectCalendarResult =
    | { ok: true; authorizationUrl: string }
    | { ok: false; message: string; notConfigured?: true };

/** Lo que devuelve desconectar: éxito, o el mensaje para el Usuario. */
export type DisconnectCalendarResult = { ok: true } | { ok: false; message: string };

/**
 * Empieza a conectar la cuenta de Google del Usuario. No refresca nada: el navegador se va a Google. Con el 409
 * (ya hay una conexión) refresca la pantalla, así muestra la que hay.
 */
export async function connectGoogleCalendarAction(): Promise<ConnectCalendarResult> {
    try {
        const { authorizationUrl } = await getInjection('IStartGoogleCalendarConnectionController')();
        return { ok: true, authorizationUrl };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof CalendarNotConfiguredError) {
            return { ok: false, notConfigured: true, message: CALENDAR_NOT_CONFIGURED_MESSAGE };
        }
        if (error instanceof CalendarAlreadyConnectedError) {
            refresh();
            return { ok: false, message: 'Ya tenés un calendario conectado. Actualizamos la pantalla.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: CALENDAR_CONNECT_FAILED_MESSAGE };
    }
}

/** Desconecta el Calendario conectado del Usuario y refresca la pantalla; si ya no había, la refresca igual. */
export async function disconnectCalendarAction(): Promise<DisconnectCalendarResult> {
    try {
        await getInjection('IDisconnectCalendarController')();
        refresh();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: 'Este calendario ya estaba desconectado. Actualizamos la pantalla.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos desconectar tu calendario. Intentá de nuevo.' };
    }
}
