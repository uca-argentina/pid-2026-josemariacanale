import type { Metadata } from 'next';
import { Header } from '@/app/_components/Header';
import { Footer } from '@/app/_components/Footer';
import { BranchPublicPage } from './_components/BranchPublicPage';
import {
    branch,
    branches,
    business,
    categories,
    photos,
    services,
} from './_components/mock-business';

// ponytail: maqueta de la página del Enlace de reserva. Más adelante es una ruta dinámica
// (ver docs/specs/enlace-de-reserva.md) y estos datos salen de un controller por DI, no del mock.
// El server los arma y los baja por props: los componentes de abajo nunca buscan datos por su
// cuenta (docs/agents/ui-components.md).

export const metadata: Metadata = {
    title: `${business.name} · Reservá tu turno`,
    description: business.description,
};

export default function BusinessPage() {
    return (
        <>
            {/* ponytail: sin Sesión a propósito. La spec del Enlace de reserva pide cero dependencia
                de identidad (US 24), así que la página renderiza igual para cualquiera que abra el
                link. Si después se quiere el estado de sesión acá, es agregar getCurrentUser(). */}
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                <BranchPublicPage
                    business={business}
                    branch={branch}
                    branches={branches}
                    services={services}
                    categories={categories}
                    photos={photos}
                />
            </div>
            <Footer />
        </>
    );
}
