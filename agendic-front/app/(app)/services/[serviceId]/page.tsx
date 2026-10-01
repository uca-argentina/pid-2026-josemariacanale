import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { ServiceDetail } from './_components/ServiceDetail';

export const metadata = { title: 'Servicio' };

/** El detalle de un Servicio del catálogo del Usuario. Un id que no está en el catálogo da no encontrado. */
export default async function ServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
    const { serviceId } = await params;
    let detail;
    try {
        detail = await getInjection('IGetMyServiceController')({ serviceId });
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof NotFoundError || error instanceof InputParseError) notFound();
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <ServiceDetail detail={detail} />;
}
