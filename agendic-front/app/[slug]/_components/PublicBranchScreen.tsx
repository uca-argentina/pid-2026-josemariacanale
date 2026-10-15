import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { AppToaster } from '@/app/_components/AppToaster';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import type { BookingPrefill } from '@/app/_components/booking/booking-prefill';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { BranchPublicPage } from './BranchPublicPage';

/** Los tramos del Enlace de reserva que llevan a una Sucursal; el del Servicio es opcional (ADR 0018), y el del Empleado, solo después de él (ADR 0026). */
export type PublicBranchSlugs = { businessSlug: string; branchSlug: string; serviceSlug?: string; employeeSlug?: string };

/** La metadata y la página piden lo mismo: una sola llamada al back por request. */
const getPublicBranch = cache((businessSlug: string, branchSlug: string, serviceSlug?: string, employeeSlug?: string) =>
    getInjection('IGetPublicBranchController')({ businessSlug, branchSlug, serviceSlug, employeeSlug }),
);

/** Un tramo mal formado no puede ser de ningún Negocio: es el mismo 404 que uno que no existe. */
const isNotFound = (error: unknown) => error instanceof NotFoundError || error instanceof InputParseError;

/** La metadata de la página de la Sucursal; vacía si falla, porque la página decide entre 404 y el aviso de error. */
export async function publicBranchMetadata({ businessSlug, branchSlug, serviceSlug, employeeSlug }: PublicBranchSlugs): Promise<Metadata> {
    try {
        const { business, branch, selectedService } = await getPublicBranch(businessSlug, branchSlug, serviceSlug, employeeSlug);
        const service = selectedService ? `${selectedService.name} · ` : '';
        return { title: `${service}${business.name} · ${branch.name} · Reservá tu turno`, description: branch.description };
    } catch {
        return {};
    }
}

/**
 * La página de reserva de una Sucursal. Con tramo de Servicio abre la reserva con ese Servicio ya
 * elegido, aunque sea oculto; un tramo que no es de ningún Servicio activo de la Sucursal es 404. Con tramo de Empleado,
 * la reserva es con él (Empleado elegido); si no Ofrece el Servicio, o no es Empleado, también es 404.
 * Sin Sesión a propósito: la página del Enlace de reserva no depende de quién la abre.
 */
export async function PublicBranchScreen({ prefill, ...slugs }: PublicBranchSlugs & { prefill: BookingPrefill }) {
    const { businessSlug, branchSlug, serviceSlug, employeeSlug } = slugs;
    let page;
    try {
        page = await getPublicBranch(businessSlug, branchSlug, serviceSlug, employeeSlug);
    } catch (error) {
        if (isNotFound(error)) notFound();
        getInjection('ICrashReporterService').report(error);
        page = null;
    }

    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                {page ? (
                    <BranchPublicPage
                        business={page.business}
                        branch={page.branch}
                        otherBranches={page.otherBranches}
                        services={page.services}
                        employees={page.employees}
                        images={page.images}
                        selectedService={page.selectedService}
                        selectedEmployee={page.selectedEmployee}
                        prefill={prefill}
                    />
                ) : (
                    <BackendErrorNotice />
                )}
            </div>
            <Footer />
            <AppToaster />
        </>
    );
}
