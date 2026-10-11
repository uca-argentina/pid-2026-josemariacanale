import type { Metadata } from 'next';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { PublicBusinessScreen, publicBusinessMetadata } from './_components/PublicBusinessScreen';
import { PublicUserScreen, publicUserMetadata } from './_components/PublicUserScreen';
import { resolveBookingLink } from './_components/resolve-booking-link';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind === 'business') return publicBusinessMetadata(resolved.business.slug);
    if (resolved?.kind === 'user') return publicUserMetadata({ userSlug: resolved.user.slug });
    return {};
}

/** El primer tramo del Enlace de reserva (ADR 0026): la página del Negocio o la del Usuario, según de quién sea. */
export default async function PublicLinkPage({ params }: { params: Promise<Params> }) {
    const { slug } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind === 'business') return <PublicBusinessScreen businessSlug={resolved.business.slug} />;
    if (resolved?.kind === 'user') return <PublicUserScreen userSlug={resolved.user.slug} />;
    return <BackendErrorNotice />;
}
