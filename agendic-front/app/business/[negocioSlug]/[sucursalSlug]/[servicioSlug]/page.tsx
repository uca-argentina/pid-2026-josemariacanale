import type { Metadata } from 'next';
import { PublicBranchScreen, publicBranchMetadata } from '../_components/PublicBranchScreen';

type Params = { negocioSlug: string; sucursalSlug: string; servicioSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { negocioSlug, sucursalSlug, servicioSlug } = await params;
    return publicBranchMetadata({ businessSlug: negocioSlug, branchSlug: sucursalSlug, serviceSlug: servicioSlug });
}

/** El Enlace de reserva de un Servicio (ADR 0018): la misma página de la Sucursal, con ese Servicio ya elegido. */
export default async function PublicServicePage({ params }: { params: Promise<Params> }) {
    const { negocioSlug, sucursalSlug, servicioSlug } = await params;
    return <PublicBranchScreen businessSlug={negocioSlug} branchSlug={sucursalSlug} serviceSlug={servicioSlug} />;
}
