import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import type { MyInvitation } from '@/src/entities/models/employee';
import { PageHeader } from './_components/business-ui';
import { BusinessOverview } from './_components/BusinessOverview';
import { EmployeeBusiness } from './_components/EmployeeBusiness';
import { NoBusinessView } from './_components/NoBusinessView';

export const metadata = { title: 'Negocios' };

export default async function BusinessPage() {
    // El layout ya exige Sesión, pero renderiza en paralelo con la página.
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    // Si la consulta falla no se ofrece Crear Negocio: haría creer al Dueño que no tiene Negocio (ADR 0012).
    let businesses;
    let branchesByBusiness;
    try {
        businesses = await getInjection('IListMyBusinessesController')();
        const listBranches = getInjection('IListBranchesWithImagesController');
        // Solo los Negocios ajenos muestran Sucursales: las del Dueño se editan en su propia pantalla.
        branchesByBusiness = new Map(
            await Promise.all(
                businesses
                    .filter((b) => b.role === 'employee')
                    .map(async (b) => {
                        const branches = await listBranches({ businessId: b.id });
                        return [b.id, branches.filter((branch) => b.branchIds.includes(branch.id))] as const;
                    }),
            ),
        );
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    // Crear Negocio y las Invitaciones valen mientras el Usuario no es Dueño de ninguno, aunque sea Empleado de otros.
    const isOwner = businesses.some((b) => b.role === 'owner');
    let invitations: MyInvitation[] = [];
    if (!isOwner) {
        try {
            invitations = await getInjection('IListMyInvitationsController')();
        } catch (error) {
            unstable_rethrow(error);
            if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
            getInjection('ICrashReporterService').report(error);
        }
    }

    // Un solo Negocio se ve abierto; con varios, todos cerrados.
    const defaultOpen = businesses.length === 1;

    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <PageHeader title="Negocios" description="Tus Negocios, sus Empleados y cómo los ven tus Clientes." />
            {!isOwner && <NoBusinessView invitations={invitations} owner={{ name: user.name, email: user.email }} />}
            {businesses.length > 0 && (
                <div className="flex flex-col gap-4">
                    {businesses.map((business) =>
                        business.role === 'owner' ? (
                            <BusinessOverview key={business.id} business={business} defaultOpen={defaultOpen} />
                        ) : (
                            <EmployeeBusiness
                                key={business.id}
                                business={{ ...business, branches: branchesByBusiness.get(business.id) ?? [] }}
                                defaultOpen={defaultOpen}
                            />
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
