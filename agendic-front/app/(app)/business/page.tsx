import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import type { MyInvitation } from '@/src/entities/models/employee';
import { PageHeader } from './_components/business-ui';
import { BusinessOverview } from './_components/BusinessOverview';
import { NoBusinessView } from './_components/NoBusinessView';

export const metadata = { title: 'Mi Negocio' };

export default async function BusinessPage() {
    // El layout ya exige Sesión, pero renderiza en paralelo con la página.
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    // Si la consulta falla no se ofrece Crear Negocio: haría creer al Dueño que no tiene Negocio (ADR 0012).
    let business;
    try {
        business = await getInjection('IGetMyBusinessController')();
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    let invitations: MyInvitation[] = [];
    if (!business) {
        try {
            invitations = await getInjection('IListMyInvitationsController')();
        } catch (error) {
            unstable_rethrow(error);
            if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
            getInjection('ICrashReporterService').report(error);
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <PageHeader title="Mi Negocio" description="Tu Negocio, tus Empleados y cómo lo ven tus Clientes." />
            {business ? (
                <BusinessOverview business={business} />
            ) : (
                <NoBusinessView invitations={invitations} owner={{ name: user.name, email: user.email }} />
            )}
        </div>
    );
}
