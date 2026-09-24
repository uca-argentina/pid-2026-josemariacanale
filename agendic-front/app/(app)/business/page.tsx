import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { ONBOARDING_PATH, SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { Topbar } from '../_components/Topbar';
import { BusinessForm } from './_components/BusinessForm';

export const metadata = { title: 'Mi Negocio' };

export default async function BusinessPage() {
    let business;
    try {
        business = await getInjection('IGetMyBusinessController')();
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    // Un Usuario sin Negocio todavía no hizo Crear Negocio.
    if (!business) redirect(ONBOARDING_PATH);

    return (
        <>
            <Topbar title="Mi Negocio" subtitle="Los datos que ven tus Clientes." />
            <div className="w-full max-w-[560px] p-7">
                <BusinessForm business={business} />
            </div>
        </>
    );
}
