'use client';

import { useState } from 'react';
import { ClientBookingDetail } from '@/app/_components/client-booking/ClientBookingDetail';
import type {
    ClientBooking,
    ClientStreakView,
} from '@/app/_components/client-booking/types';
import {
    cancelBookingByLinkAction,
    cancelBookingSeriesByLinkAction,
    crearReclamo,
    markEmployeeNoShowByLinkAction,
    payDepositByLinkAction,
    rateBookingByLinkAction,
    rescheduleBookingByLinkAction,
    type Reclamo,
} from '../../actions';
import { BookAgainLink } from './BookAgainLink';
import { StreakBlock } from './StreakBlock';
import { TextDialog } from '@/app/_components/quick/TextDialog';

/**
 * Muestra el Turno de un Enlace del Turno (ADR 0022), solo, con Pagar la Seña, Cancelar y Reagendar. El Enlace es la credencial:
 * no hay acceso que venza, así que no hay vuelta a pedir un código. Debajo va la Racha del Cliente (`streak`), si hay: la
 * trae solo la lectura del Enlace, y ninguna acción de acá la cambia, así que se queda como llegó.
 * Después, el Reclamo del Turno si ya hay uno; si no, el botón para hacerlo (al mandarlo, la página se recarga y lo muestra).
 */
export function BookingLinkScreen({
    link,
    booking: initial,
    streak,
    reclamo,
    now,
}: {
    link: string;
    booking: ClientBooking;
    streak: ClientStreakView;
    reclamo: Reclamo | null;
    now: number;
}) {
    const [booking, setBooking] = useState(initial);
    return (
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-4 pt-6 pb-20 sm:px-8">
            <h1 className="mb-6 text-[32px] leading-none font-extrabold tracking-[-0.03em]">
                Tu turno
            </h1>

            <ClientBookingDetail
                booking={booking}
                now={now}
                payDeposit={() => payDepositByLinkAction(link)}
                cancel={(reason, andFollowing) =>
                    andFollowing
                        ? cancelBookingSeriesByLinkAction(link, reason)
                        : cancelBookingByLinkAction(link, reason)
                }
                reschedule={(startsAt) =>
                    rescheduleBookingByLinkAction(link, startsAt)
                }
                markEmployeeNoShow={() => markEmployeeNoShowByLinkAction(link)}
                rate={(score, comment) =>
                    rateBookingByLinkAction(link, score, comment)
                }
                onUpdated={setBooking}
            />

            {streak && <StreakBlock streak={streak} />}

            {reclamo ? (
                <ReclamoBlock reclamo={reclamo} />
            ) : (
                <TextDialog
                    action={crearReclamo.bind(null, link)}
                    trigger="Hacer un reclamo"
                    title="Hacer un reclamo"
                    label="Reclamo"
                    submitLabel="Mandar"
                />
            )}
            <BookAgainLink booking={booking} />
        </div>
    );
}

function ReclamoBlock({ reclamo }: { reclamo: Reclamo }) {
    return (
        <section className="mt-6 flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold">Tu reclamo</h2>
                <span className="text-[13px] text-muted-foreground">
                    {reclamo.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                </span>
            </div>
            <p className="text-[14px]">{reclamo.reason}</p>
            {reclamo.response && (
                <p className="text-[14px] text-muted-foreground">
                    <span className="font-semibold">Respuesta: </span>
                    {reclamo.response}
                </p>
            )}
        </section>
    );
}
