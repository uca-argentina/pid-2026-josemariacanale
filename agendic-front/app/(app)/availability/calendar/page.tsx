import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { CalendarDisconnectedError, CalendarsUnavailableError } from '@/src/entities/errors/calendar';
import { NotFoundError } from '@/src/entities/errors/common';
import { isCalendarDisconnected, type AccountCalendar } from '@/src/entities/models/calendar-connection';
import { parseCalendarReturn } from './calendar-return';
import { CalendarView } from './_components/CalendarView';

export const metadata = { title: 'Calendario conectado' };

/**
 * El Calendario conectado del Usuario con Sesión. Es la URL a la que vuelve el back desde Google
 * (`CALENDAR_RETURN_URL`), con `?calendar=` diciendo cómo salió.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ calendar?: string }> }) {
    const { calendar } = await searchParams;

    let connection;
    try {
        connection = await getInjection('IGetMyCalendarConnectionController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    // Con la conexión `CONNECTED` se leen los calendarios de la cuenta. Un 409 o un 404 es que el estado cambió desde
    // que se leyó la conexión: la pantalla muestra el real. Si Google no responde, la lista pide reintentar.
    let calendars: AccountCalendar[] | null = null;
    let calendarsUnavailable = false;
    if (connection && !isCalendarDisconnected(connection)) {
        try {
            calendars = await getInjection('IListAccountCalendarsController')();
        } catch (error) {
            unstable_rethrow(error);
            if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
            if (error instanceof CalendarDisconnectedError) connection = { ...connection, status: 'DISCONNECTED' as const };
            else if (error instanceof NotFoundError) connection = null;
            else if (error instanceof CalendarsUnavailableError) calendarsUnavailable = true;
            else {
                getInjection('ICrashReporterService').report(error);
                return <BackendErrorNotice />;
            }
        }
    }

    return (
        <CalendarView
            connection={connection}
            calendars={calendars}
            calendarsUnavailable={calendarsUnavailable}
            returned={parseCalendarReturn(calendar)}
        />
    );
}
