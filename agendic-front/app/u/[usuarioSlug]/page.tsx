import type { Metadata } from 'next';
import { PublicUserScreen, publicUserMetadata } from './_components/PublicUserScreen';

type Params = { usuarioSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { usuarioSlug } = await params;
    return publicUserMetadata({ userSlug: usuarioSlug });
}

/** El Enlace de reserva de un Usuario (ADR 0021): sus Servicios personales. */
export default async function PublicUserPage({ params }: { params: Promise<Params> }) {
    const { usuarioSlug } = await params;
    return <PublicUserScreen userSlug={usuarioSlug} />;
}
