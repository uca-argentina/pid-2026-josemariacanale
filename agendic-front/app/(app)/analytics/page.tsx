import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { myPreferences } from '../my-preferences';
import { AnalyticsView } from './_components/AnalyticsView';

export const metadata = { title: 'Analíticas' };

/** Analíticas del Usuario con Sesión: las de sus Servicios personales y las de cada Negocio del que es Empleado. */
export default async function AnalyticsPage() {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);
    let businesses;
    try {
        businesses = await getInjection('IListAnalyticsBusinessesController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return (
        <AnalyticsView
            user={{ name: user.name, imageUrl: user.imageUrl ?? null }}
            businesses={businesses}
            weekStart={(await myPreferences()).weekStart}
        />
    );
}
