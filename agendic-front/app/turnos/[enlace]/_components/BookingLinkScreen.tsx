'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClientBookingDetail } from '@/app/_components/client-booking/ClientBookingDetail';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { MIS_TURNOS_PATH } from '@/app/routes';
import { cancelBookingByLinkAction, rescheduleBookingByLinkAction } from '../../actions';

/**
 * El Turno de un Enlace del Turno (ADR 0022), solo, con Cancelar y Reagendar como en Mis turnos. El Enlace es la
 * credencial: no hay acceso que venza, así que no hay vuelta a pedir un código.
 */
export function BookingLinkScreen({ link, booking: initial, now }: { link: string; booking: ClientBooking; now: number }) {
    const [booking, setBooking] = useState(initial);

    return (
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-4 pt-6 pb-20 sm:px-8">
            <h1 className="mb-6 text-[32px] leading-none font-extrabold tracking-[-0.03em]">Tu turno</h1>

            <ClientBookingDetail
                booking={booking}
                now={now}
                cancel={() => cancelBookingByLinkAction(link)}
                reschedule={(startsAt) => rescheduleBookingByLinkAction(link, startsAt)}
                onUpdated={setBooking}
            />

            <MisTurnosLink />
        </div>
    );
}

/** El paso a Mis turnos, para ver los demás Turnos del mismo email. */
export function MisTurnosLink() {
    return (
        <Link
            href={MIS_TURNOS_PATH}
            className="mt-6 self-start text-[14px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
            Ver todos mis turnos
        </Link>
    );
}
