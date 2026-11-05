'use client';

import { useState } from 'react';
import { ClientBookingDetail } from '@/app/_components/client-booking/ClientBookingDetail';
import type { ClientBooking, ClientStreakView } from '@/app/_components/client-booking/types';
import { cancelBookingByLinkAction, cancelBookingSeriesByLinkAction, markEmployeeNoShowByLinkAction, payDepositByLinkAction, rateBookingByLinkAction, rescheduleBookingByLinkAction } from '../../actions';
import { BookAgainLink } from './BookAgainLink';
import { StreakBlock } from './StreakBlock';

/**
 * Muestra el Turno de un Enlace del Turno (ADR 0022), solo, con Pagar la Seña, Cancelar y Reagendar. El Enlace es la credencial:
 * no hay acceso que venza, así que no hay vuelta a pedir un código. Debajo va la Racha del Cliente (`streak`), si hay: la
 * trae solo la lectura del Enlace, y ninguna acción de acá la cambia, así que se queda como llegó.
 */
export function BookingLinkScreen({ link, booking: initial, streak, now }: { link: string; booking: ClientBooking; streak: ClientStreakView; now: number }) {
    const [booking, setBooking] = useState(initial);

    return (
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-4 pt-6 pb-20 sm:px-8">
            <h1 className="mb-6 text-[32px] leading-none font-extrabold tracking-[-0.03em]">Tu turno</h1>

            <ClientBookingDetail
                booking={booking}
                now={now}
                payDeposit={() => payDepositByLinkAction(link)}
                cancel={(reason, andFollowing) => (andFollowing ? cancelBookingSeriesByLinkAction(link, reason) : cancelBookingByLinkAction(link, reason))}
                reschedule={(startsAt) => rescheduleBookingByLinkAction(link, startsAt)}
                markEmployeeNoShow={() => markEmployeeNoShowByLinkAction(link)}
                rate={(score, comment) => rateBookingByLinkAction(link, score, comment)}
                onUpdated={setBooking}
            />

            {streak && <StreakBlock streak={streak} />}

            <BookAgainLink booking={booking} />
        </div>
    );
}
