import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readBookingPrefill } from '@/app/_components/booking/booking-prefill';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { PublicBranchScreen, publicBranchMetadata } from '../../_components/PublicBranchScreen';
import { resolveBookingLink } from '../../_components/resolve-booking-link';

type Params = { slug: string; second: string; third: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug, second, third } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind !== 'business') return {};
    return publicBranchMetadata({ businessSlug: resolved.business.slug, branchSlug: second, serviceSlug: third });
}

/**
 * El Enlace de reserva de un Servicio (ADR 0018): la página de la Sucursal con ese Servicio ya elegido. Un Usuario no
 * tiene un tercer tramo: es página no encontrada.
 */
export default async function PublicLinkThirdPage({
    params,
    searchParams,
}: {
    params: Promise<Params>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug, second, third } = await params;
    const prefill = readBookingPrefill(await searchParams);
    const resolved = await resolveBookingLink(slug);
    if (!resolved) return <BackendErrorNotice />;
    if (resolved.kind === 'user') notFound();
    return <PublicBranchScreen businessSlug={resolved.business.slug} branchSlug={second} serviceSlug={third} prefill={prefill} />;
}
