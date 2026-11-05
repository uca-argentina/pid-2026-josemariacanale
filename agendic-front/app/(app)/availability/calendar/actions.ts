'use server';

import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import {
    CALENDAR_CONNECT_FAILED_MESSAGE,
    CALENDAR_DISCONNECTED_NOTICE,
    calendarNotConfiguredMessage,
    CALENDARS_UNAVAILABLE_MESSAGE,
} from '@/app/(app)/_components/calendar-copy';
import {
    CalendarAlreadyConnectedError,
    CalendarDisconnectedError,
    CalendarNotConfiguredError,
    CalendarNotInAccountError,
    CalendarsUnavailableError,
} from '@/src/entities/errors/calendar';
import { NotFoundError } from '@/src/entities/errors/common';
import type { AccountCalendar, CalendarProvider } from '@/src/entities/models/calendar-connection';

/** Lo que devuelve conectar: a dónde llevar el navegador, o el mensaje para el Usuario (`notConfigured`: el proveedor no está configurado en el back). */
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
    return connectCalendar('GOOGLE', () => getInjection('IStartGoogleCalendarConnectionController')());
}

/** Lo mismo con la cuenta de Microsoft (Outlook o Microsoft 365) del Usuario. */
export async function connectMicrosoftCalendarAction(): Promise<ConnectCalendarResult> {
    return connectCalendar('MICROSOFT', () => getInjection('IStartMicrosoftCalendarConnectionController')());
}

async function connectCalendar(provider: CalendarProvider, start: () => Promise<{ authorizationUrl: string }>): Promise<ConnectCalendarResult> {
    try {
        const { authorizationUrl } = await start();
        return { ok: true, authorizationUrl };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof CalendarNotConfiguredError) {
            return { ok: false, notConfigured: true, message: calendarNotConfiguredMessage(provider) };
        }
        if (error instanceof CalendarAlreadyConnectedError) {
            refresh();
            return { ok: false, message: 'Ya tenés un calendario conectado. Actualizamos la pantalla.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: CALENDAR_CONNECT_FAILED_MESSAGE };
    }
}

/** Lo que devuelve guardar la selección: los calendarios como quedaron, o el mensaje para el Usuario. */
export type SetCheckedCalendarsResult = { ok: true; calendars: AccountCalendar[] } | { ok: false; message: string };

/**
 * Guarda cuáles calendarios cuentan como Ocupado externo con un solo `PUT` y devuelve la lista como quedó, sin
 * refrescar: la pantalla refleja la respuesta. Con el 409 (la conexión pasó a `DISCONNECTED`), el 404 (ya no hay
 * conexión) y el 422 (un calendario ya no es de la cuenta) refresca, así la pantalla muestra el estado real.
 */
export async function setCheckedCalendarsAction(checkedIds: string[]): Promise<SetCheckedCalendarsResult> {
    try {
        const calendars = await getInjection('ISetCheckedCalendarsController')({ checkedIds });
        return { ok: true, calendars };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof CalendarDisconnectedError) {
            refresh();
            return { ok: false, message: CALENDAR_DISCONNECTED_NOTICE };
        }
        if (error instanceof NotFoundError) {
            refresh();
            return { ok: false, message: 'Ya no tenés un calendario conectado. Actualizamos la pantalla.' };
        }
        if (error instanceof CalendarNotInAccountError) {
            refresh();
            return { ok: false, message: 'Cambiaron los calendarios de tu cuenta. Actualizamos la lista, revisá la selección.' };
        }
        if (error instanceof CalendarsUnavailableError) return { ok: false, message: CALENDARS_UNAVAILABLE_MESSAGE };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos guardar tu selección. Intentá de nuevo.' };
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
