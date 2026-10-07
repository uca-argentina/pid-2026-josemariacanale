import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { UserPublicPage } from './UserPublicPage';

/** Los tramos del Enlace de reserva de un Usuario; el del Servicio es opcional (ADR 0021). */
export type PublicUserSlugs = { userSlug: string; serviceSlug?: string };

/** La metadata y la página piden lo mismo: una sola llamada al back por request. */
const getUserPage = cache((userSlug: string, serviceSlug?: string) =>
    getInjection('IGetUserPageController')({ userSlug, serviceSlug }),
);

/** Un tramo mal formado no puede ser de ningún Usuario: es el mismo 404 que uno que no existe. */
const isNotFound = (error: unknown) => error instanceof NotFoundError || error instanceof InputParseError;

/** La metadata de la página del Usuario; vacía si falla, porque la página decide entre 404 y el aviso de error. */
export async function publicUserMetadata({ userSlug, serviceSlug }: PublicUserSlugs): Promise<Metadata> {
    try {
        const { user, selectedService } = await getUserPage(userSlug, serviceSlug);
        const service = selectedService ? `${selectedService.name} · ` : '';
        return { title: `${service}${user.name} · Reservá tu turno` };
    } catch {
        return {};
    }
}

/**
 * La página del Enlace de reserva de un Usuario: sus Servicios personales. Con tramo de Servicio abre la reserva con
 * ese Servicio ya elegido, aunque sea oculto; un tramo que no es de ningún Servicio suyo es 404. Sin Sesión a
 * propósito, como la de la Sucursal.
 */
export async function PublicUserScreen({ userSlug, serviceSlug }: PublicUserSlugs) {
    let page;
    try {
        page = await getUserPage(userSlug, serviceSlug);
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
                    <UserPublicPage user={page.user} services={page.services} selectedService={page.selectedService} />
                ) : (
                    <BackendErrorNotice />
                )}
            </div>
            <Footer />
        </>
    );
}
