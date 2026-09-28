import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { MapPin } from 'lucide-react';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { bookingLinkPath } from '@/app/routes';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

type Params = { negocioSlug: string };

// La metadata y la página piden lo mismo: una sola llamada al back por request.
const getPublicBusiness = cache((businessSlug: string) =>
    getInjection('IGetPublicBusinessController')({ businessSlug }),
);

// Un tramo mal formado no puede ser de ningún Negocio: es el mismo 404 que uno que no existe.
const isNotFound = (error: unknown) => error instanceof NotFoundError || error instanceof InputParseError;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { negocioSlug } = await params;
    try {
        const { business } = await getPublicBusiness(negocioSlug);
        return { title: `${business.name} · Reservá tu turno`, description: business.description };
    } catch {
        return {}; // la página decide entre 404 y el aviso de error
    }
}

// El Enlace de reserva sin tramo de Sucursal (ADR 0014): con una sola Sucursal lleva directo a
// ella, así el enlace que el Dueño ya compartió no se rompe; con varias, el Cliente elige.
export default async function PublicBusinessPage({ params }: { params: Promise<Params> }) {
    const { negocioSlug } = await params;

    let page;
    try {
        page = await getPublicBusiness(negocioSlug);
    } catch (error) {
        if (isNotFound(error)) notFound();
        getInjection('ICrashReporterService').report(error);
        page = null;
    }

    const { business, branches } = page ?? {};
    if (business && branches?.length === 1) redirect(bookingLinkPath(business.slug, branches[0].slug));

    return (
        <>
            <Header user={null} nav={false} />
            <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pt-6 pb-20 sm:px-8">
                {business && branches ? (
                    <>
                        <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[52px]">
                            {business.name}
                        </h1>
                        <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">
                            {business.description}
                        </p>

                        {branches.length > 0 ? (
                            <section aria-labelledby="sucursales-titulo" className="mt-10">
                                <h2
                                    id="sucursales-titulo"
                                    className="text-[24px] leading-none font-extrabold tracking-[-0.03em]"
                                >
                                    Elegí una sucursal
                                </h2>
                                <ul className="mt-5 flex flex-col gap-3">
                                    {branches.map((branch) => (
                                        <li key={branch.id}>
                                            <Link
                                                href={bookingLinkPath(business.slug, branch.slug)}
                                                className="flex flex-col gap-1 rounded-2xl border border-border p-4.5 transition-colors hover:border-foreground/20"
                                            >
                                                <span className="text-[15.5px] font-bold tracking-[-0.02em]">
                                                    {branch.name}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-[13.5px] text-muted-foreground">
                                                    <MapPin className="size-4" />
                                                    {branch.address}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : (
                            <p className="mt-10 text-[14.5px] text-muted-foreground">
                                Este negocio todavía no tiene sucursales para reservar.
                            </p>
                        )}
                    </>
                ) : (
                    <BackendErrorNotice />
                )}
            </main>
            <Footer />
        </>
    );
}
