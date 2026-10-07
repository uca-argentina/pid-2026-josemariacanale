import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { ServicesList } from './_components/ServicesList';

export const metadata = { title: 'Servicios' };

/**
 * Los Servicios del Usuario: los personales, con su Enlace de reserva, y el catálogo, un grupo por Negocio del que es
 * Empleado activo.
 */
export default async function ServicesPage() {
    let groups, personal;
    try {
        [groups, personal] = await Promise.all([
            getInjection('IListMyServicesController')(),
            getInjection('IListMyPersonalServicesController')(),
        ]);
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <ServicesList groups={groups} personal={personal} />;
}
