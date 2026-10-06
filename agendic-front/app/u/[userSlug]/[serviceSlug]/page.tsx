import type { Metadata } from 'next';
import { PublicUserScreen, publicUserMetadata } from '../_components/PublicUserScreen';

type Params = { userSlug: string; serviceSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { userSlug, serviceSlug } = await params;
    return publicUserMetadata({ userSlug, serviceSlug });
}

/** El Enlace de reserva de un Servicio personal: la misma página del Usuario, con ese Servicio ya elegido. */
export default async function PublicUserServicePage({ params }: { params: Promise<Params> }) {
    const { userSlug, serviceSlug } = await params;
    return <PublicUserScreen userSlug={userSlug} serviceSlug={serviceSlug} />;
}
