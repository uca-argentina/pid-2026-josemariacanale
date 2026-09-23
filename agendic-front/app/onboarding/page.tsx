import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { SIGN_IN_PATH } from '@/app/routes';
import { CreateBusinessWizard } from './_components/CreateBusinessWizard';

export const metadata = { title: 'Crear Negocio' };

// Fuera del grupo (app): el alta va a pantalla completa, sin el sidebar del panel.
export default async function OnboardingPage() {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    return (
        <main className="min-h-screen w-full bg-muted">
            <CreateBusinessWizard />
        </main>
    );
}
