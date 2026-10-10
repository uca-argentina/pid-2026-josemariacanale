import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { BUSINESS_PATH, SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { PageHeader } from '../_components/business-ui';
import { BranchesView } from './_components/BranchesView';

export const metadata = { title: 'Sucursales' };

export default async function BranchesPage() {
    let business;
    let branches;
    try {
        business = await getInjection('IGetMyBusinessController')();
        branches = business ? await getInjection('IListBranchesWithImagesController')({ businessId: business.id }) : [];
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    if (!business) redirect(BUSINESS_PATH);

    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <PageHeader
                title="Sucursales"
                description="El Logo de tu Negocio y tus Sucursales, con su descripción e imágenes."
                backHref={BUSINESS_PATH}
                backLabel="Volver a Mi Negocio"
            />
            <BranchesView businessId={business.id} businessSlug={business.slug} logoUrl={business.logoUrl} branches={branches} />
        </div>
    );
}
