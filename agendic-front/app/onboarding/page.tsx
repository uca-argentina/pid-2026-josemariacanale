import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH, SIGNED_IN_HOME_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { CreateBusinessWizard } from './_components/CreateBusinessWizard';

export const metadata = { title: 'Crear Negocio' };

// Fuera del grupo (app): el alta va a pantalla completa, sin el sidebar del panel.
export default async function OnboardingPage() {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    // Si la consulta falla no se muestra el formulario: haría creer al Dueño que no tiene
    // Negocio (ADR 0012). Solo un 200 con lista vacía habilita Crear Negocio.
    let myBusiness;
    try {
        myBusiness = await getInjection('IGetMyBusinessController')();
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return (
            <main className="flex min-h-screen w-full items-center justify-center bg-muted">
                <BackendErrorNotice />
            </main>
        );
    }

    // Un Usuario es Dueño de un solo Negocio (ADR 0012): quien ya tiene uno va a su panel.
    if (myBusiness) redirect(SIGNED_IN_HOME_PATH);

    return (
        <main className="min-h-screen w-full bg-muted">
            <CreateBusinessWizard />
        </main>
    );
}
