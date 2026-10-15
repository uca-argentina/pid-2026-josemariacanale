import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { myPreferences } from '../../my-preferences';
import type { HolidaysTabData } from './_components/HolidaysTab';
import { OutOfOfficeView } from './_components/OutOfOfficeView';

export const metadata = { title: 'Fuera de la oficina' };

/** Lo que la pestaña Días festivos muestra: sus datos, o el mensaje del back si el deploy no tiene Días festivos. */
async function loadHolidays(): Promise<HolidaysTabData> {
    try {
        const [countries, settings, conflicts] = await Promise.all([
            getInjection('IListHolidayCountriesController')(),
            getInjection('IGetMyHolidaysController')(),
            getInjection('IListHolidayConflictsController')(),
        ]);
        return { countries, settings, conflicts };
    } catch (error) {
        if (error instanceof HolidaysNotConfiguredError) return { unavailable: error.message };
        throw error;
    }
}

/**
 * Fuera de la oficina del Usuario con Sesión: sus períodos, o con `?type=holidays` sus Días festivos. `?nuevo`
 * abre el modal de período nuevo.
 */
export default async function OutOfOfficePage({ searchParams }: { searchParams: Promise<{ nuevo?: string; type?: string }> }) {
    const { nuevo, type } = await searchParams;
    const showHolidays = type === 'holidays';
    const preferences = await myPreferences();
    let periods;
    let holidays;
    try {
        if (showHolidays) holidays = await loadHolidays();
        else periods = await getInjection('IListMyOutOfOfficeController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return (
        <OutOfOfficeView
            key={showHolidays ? 'holidays' : 'mine'}
            periods={periods ?? []}
            openNew={nuevo !== undefined && !showHolidays}
            weekStart={preferences.weekStart}
            timeFormat={preferences.timeFormat}
            holidays={holidays}
        />
    );
}
