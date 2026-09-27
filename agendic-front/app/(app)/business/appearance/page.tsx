import { BUSINESS_PATH } from '@/app/routes';
import { PageHeader } from '../_components/business-ui';
import { AppearanceView } from './_components/AppearanceView';

export const metadata = { title: 'Apariencia' };

export default function AppearancePage() {
    return (
        <div className="flex flex-1 flex-col gap-8 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <PageHeader
                title="Apariencia del Enlace de reserva"
                description="Elegí cómo ven tus Clientes tu Enlace de reserva."
                backHref={BUSINESS_PATH}
                backLabel="Volver a Mi Negocio"
            />
            <AppearanceView />
        </div>
    );
}
