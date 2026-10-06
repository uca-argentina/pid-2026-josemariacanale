import type { Metadata } from 'next';
import { PublicUserScreen, publicUserMetadata } from './_components/PublicUserScreen';

type Params = { userSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { userSlug } = await params;
    return publicUserMetadata({ userSlug });
}

/** El Enlace de reserva de un Usuario (ADR 0021): sus Servicios personales. */
export default async function PublicUserPage({ params }: { params: Promise<Params> }) {
    const { userSlug } = await params;
    return <PublicUserScreen userSlug={userSlug} />;
}
