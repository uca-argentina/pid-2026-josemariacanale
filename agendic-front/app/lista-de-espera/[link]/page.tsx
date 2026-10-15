import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { WaitlistEntryView } from '@/src/entities/models/waitlist';
import { LeaveWaitlistScreen } from './_components/LeaveWaitlistScreen';

export const metadata: Metadata = {
    title: 'Lista de espera · Agendic',
    robots: { index: false, follow: false },
    // La URL es una credencial de la Anotación: que no salga en el Referer hacia otros orígenes.
    referrer: 'no-referrer',
};

type LoadedEntry = { entry: WaitlistEntryView } | { failed: true };

async function loadEntry(link: string): Promise<LoadedEntry> {
    try {
        return { entry: await getInjection('IGetWaitlistEntryByLinkController')({ link }) };
    } catch (error) {
        unstable_rethrow(error);
        // Un enlace mal formado no puede ser de ninguna Anotación: es lo mismo que uno que no existe.
        if (error instanceof NotFoundError || error instanceof InputParseError) notFound();
        getInjection('ICrashReporterService').report(error);
        return { failed: true };
    }
}

/**
 * La página del enlace de la Confirmación de anotación y del Aviso de horario libre (ADR 0034): donde el Cliente
 * Sale de la Lista de espera. `lista-de-espera` es una palabra reservada del Enlace de reserva, así que esta ruta le
 * gana a `[slug]`. Abrirla no tiene efectos: sacar de la lista es el botón.
 */
export default async function WaitlistLinkPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;
    const loaded = await loadEntry(link);

    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                {'entry' in loaded ? <LeaveWaitlistScreen link={link} entry={loaded.entry} /> : <BackendErrorNotice />}
            </div>
            <Footer />
        </>
    );
}
