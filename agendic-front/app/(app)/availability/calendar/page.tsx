import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
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

    return <CalendarView connection={connection} returned={parseCalendarReturn(calendar)} />;
}
