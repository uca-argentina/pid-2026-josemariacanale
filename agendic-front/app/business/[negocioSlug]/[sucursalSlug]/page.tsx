import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { BranchPublicPage } from './_components/BranchPublicPage';

type Params = { negocioSlug: string; sucursalSlug: string };

// La metadata y la página piden lo mismo: una sola llamada al back por request.
const getPublicBranch = cache((businessSlug: string, branchSlug: string) =>
    getInjection('IGetPublicBranchController')({ businessSlug, branchSlug }),
);

// Un tramo mal formado no puede ser de ningún Negocio: es el mismo 404 que uno que no existe.
const isNotFound = (error: unknown) => error instanceof NotFoundError || error instanceof InputParseError;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { negocioSlug, sucursalSlug } = await params;
    try {
        const { business, branch } = await getPublicBranch(negocioSlug, sucursalSlug);
        return { title: `${business.name} · ${branch.name} · Reservá tu turno`, description: business.description };
    } catch {
        return {}; // la página decide entre 404 y el aviso de error
    }
}

export default async function PublicBranchPage({ params }: { params: Promise<Params> }) {
    const { negocioSlug, sucursalSlug } = await params;

    let page;
    try {
        page = await getPublicBranch(negocioSlug, sucursalSlug);
    } catch (error) {
        if (isNotFound(error)) notFound();
        getInjection('ICrashReporterService').report(error);
        page = null;
    }

    return (
        <>
            {/* Sin Sesión a propósito: la página del Enlace de reserva no depende de quién la abre. */}
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
                    />
                ) : (
                    <BackendErrorNotice />
                )}
            </div>
            <Footer />
        </>
    );
}
