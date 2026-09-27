import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { BUSINESS_PATH, SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { PageHeader } from '../_components/business-ui';
import { EmployeesView } from './_components/EmployeesView';

export const metadata = { title: 'Empleados' };

export default async function EmployeesPage() {
    let staff;
    try {
        staff = await getInjection('IListMyEmployeesController')();
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    // Sin Negocio no hay Staff: Mi Negocio ofrece Crear Negocio.
    if (!staff) redirect(BUSINESS_PATH);

    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <PageHeader
                title="Empleados"
                description="Las personas que atienden en tu Negocio."
                backHref={BUSINESS_PATH}
                backLabel="Volver a Mi Negocio"
            />
            <EmployeesView businessId={staff.businessId} employees={staff.employees} />
        </div>
    );
}
