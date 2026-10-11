import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { PublicBranchScreen, publicBranchMetadata } from '../../../_components/PublicBranchScreen';
import { resolveBookingLink } from '../../../_components/resolve-booking-link';

type Params = { slug: string; second: string; third: string; fourth: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug, second, third, fourth } = await params;
    const resolved = await resolveBookingLink(slug);
    if (resolved?.kind !== 'business') return {};
    return publicBranchMetadata({ businessSlug: resolved.business.slug, branchSlug: second, serviceSlug: third, employeeSlug: fourth });
}

/**
 * El Enlace de reserva de un Empleado (ADR 0026): la página de la Sucursal con el Servicio ya elegido y la reserva con
 * ese Empleado. Un Usuario no tiene un cuarto tramo: es página no encontrada.
 */
export default async function PublicLinkFourthPage({ params }: { params: Promise<Params> }) {
    const { slug, second, third, fourth } = await params;
    const resolved = await resolveBookingLink(slug);
    if (!resolved) return <BackendErrorNotice />;
    if (resolved.kind === 'user') notFound();
    return <PublicBranchScreen businessSlug={resolved.business.slug} branchSlug={second} serviceSlug={third} employeeSlug={fourth} />;
}
