import type { Metadata } from 'next';
import { PublicUserScreen, publicUserMetadata } from '../_components/PublicUserScreen';

type Params = { usuarioSlug: string; servicioSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { usuarioSlug, servicioSlug } = await params;
    return publicUserMetadata({ userSlug: usuarioSlug, serviceSlug: servicioSlug });
}

/** El Enlace de reserva de un Servicio personal: la misma página del Usuario, con ese Servicio ya elegido. */
export default async function PublicUserServicePage({ params }: { params: Promise<Params> }) {
    const { usuarioSlug, servicioSlug } = await params;
    return <PublicUserScreen userSlug={usuarioSlug} serviceSlug={servicioSlug} />;
}
