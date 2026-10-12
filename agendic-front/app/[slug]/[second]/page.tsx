import type { Metadata } from 'next';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { PublicBranchScreen, publicBranchMetadata } from '../_components/PublicBranchScreen';
import { PublicUserScreen, publicUserMetadata } from '../_components/PublicUserScreen';
import { resolveBookingLink } from '../_components/resolve-booking-link';

type Params = { slug: string; second: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug, second } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind === 'business') return publicBranchMetadata({ businessSlug: resolved.business.slug, branchSlug: second });
    if (resolved?.kind === 'user') return publicUserMetadata({ userSlug: resolved.user.slug, serviceSlug: second });
    return {};
}

/** El segundo tramo (ADR 0026): la Sucursal de un Negocio, o el Servicio personal de un Usuario ya elegido. */
export default async function PublicLinkSecondPage({ params }: { params: Promise<Params> }) {
    const { slug, second } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind === 'business') return <PublicBranchScreen businessSlug={resolved.business.slug} branchSlug={second} />;
    if (resolved?.kind === 'user') return <PublicUserScreen userSlug={resolved.user.slug} serviceSlug={second} />;
    return <BackendErrorNotice />;
}
