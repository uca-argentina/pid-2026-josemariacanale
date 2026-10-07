import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { readClock } from '@/app/_components/clock';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { BookingLinkScreen } from './_components/BookingLinkScreen';
import { MisTurnosLink } from './_components/MisTurnosLink';

export const metadata: Metadata = {
    title: 'Tu turno · Agendic',
    robots: { index: false, follow: false },
    // La URL es una credencial del Turno: que no salga en el Referer hacia otros orígenes (fotos, links externos).
    referrer: 'no-referrer',
};

type LoadedBooking =
    | { found: true; booking: ClientBooking }
    | { found: false; failed: boolean };

async function loadBooking(link: string): Promise<LoadedBooking> {
    try {
        return { found: true, booking: await getInjection('IGetBookingByLinkController')({ link }) };
    } catch (error) {
        unstable_rethrow(error);
        // Un Enlace mal formado no puede ser de ningún Turno: es el mismo aviso que uno que no existe.
        if (error instanceof NotFoundError || error instanceof InputParseError) return { found: false, failed: false };
        getInjection('ICrashReporterService').report(error);
        return { found: false, failed: true };
    }
}

/**
 * La página del Enlace del Turno (ADR 0022): abre ese Turno sin Código de verificación. Sin Sesión a propósito:
 * quien tiene el Enlace puede ver, Cancelar y Reagendar ese Turno.
 */
export default async function BookingLinkPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;
    const now = readClock();
    const loaded = await loadBooking(link);

    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                {loaded.found ? (
                    <BookingLinkScreen link={link} booking={loaded.booking} now={now} />
                ) : loaded.failed ? (
                    <BackendErrorNotice />
                ) : (
                    <UnknownBookingLink />
                )}
            </div>
            <Footer />
        </>
    );
}

function UnknownBookingLink() {
    return (
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-16 sm:px-8">
            <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">No encontramos este turno</h1>
            <p className="mt-3 text-[14px] text-muted-foreground">
                Revisá que el link esté completo. Desde Mis turnos podés ver todos los turnos que reservaste con tu email.
            </p>
            <MisTurnosLink />
        </div>
    );
}
