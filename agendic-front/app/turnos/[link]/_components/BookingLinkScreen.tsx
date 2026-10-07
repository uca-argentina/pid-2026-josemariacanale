'use client';

import { useState } from 'react';
import { ClientBookingDetail } from '@/app/_components/client-booking/ClientBookingDetail';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { cancelBookingByLinkAction, rescheduleBookingByLinkAction } from '../../actions';
import { MisTurnosLink } from './MisTurnosLink';

/**
 * Muestra el Turno de un Enlace del Turno (ADR 0022), solo, con Cancelar y Reagendar como en Mis turnos. El Enlace es la
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
