import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { myPreferences } from '../../my-preferences';
import { BusinessAnalyticsView } from '../_components/BusinessAnalyticsView';
import { NoBusinessHero } from '../_components/NoBusinessHero';

export const metadata = { title: 'Analíticas · Servicios del Negocio' };

/** Analíticas de los Servicios de un Negocio del que el Usuario es Empleado; sin ninguno, el hero de Crear Negocio. */
export default async function BusinessAnalyticsPage() {
    let businesses;
    try {
        businesses = await getInjection('IListAnalyticsBusinessesController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    if (businesses.length === 0) return <NoBusinessHero />;
    return <BusinessAnalyticsView businesses={businesses} weekStart={(await myPreferences()).weekStart} />;
}
