'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/app/_components/ui/button';
import { STATUS_BADGE, hostName, isActionable } from './client-booking-helpers';
import { formatDuration, formatLongDate, formatPrice, formatTime } from './format';
import { RescheduleOverlay } from './RescheduleOverlay';
import type { ClientBooking, ClientBookingActionResult } from './types';

/**
 * Muestra el detalle de un Turno del Cliente, con Cancelar y Reagendar abajo cuando todavía se puede. Lo comparten Mis
 * turnos y el Enlace del Turno: cada uno pasa sus propias acciones en `cancel` y `reschedule`, y `onExpired` solo
 * Mis turnos, que es el único con un acceso que vence.
 */
export function ClientBookingDetail({
    booking,
    now,
    cancel,
    reschedule,
    onUpdated,
    onExpired,
}: {
    booking: ClientBooking;
    now: number;
    cancel: () => Promise<ClientBookingActionResult>;
    reschedule: (startsAt: string) => Promise<ClientBookingActionResult>;
    onUpdated: (booking: ClientBooking) => void;
    onExpired?: () => void;
}) {
    const [rescheduling, setRescheduling] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const status = STATUS_BADGE[booking.status];

    return (
        <section aria-label="Detalle del turno" className="rounded-2xl border border-border p-6">
            {notice && (
                <p role="status" className="mb-5 rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                    {notice}
                </p>
            )}

            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-bold text-white">
                <status.icon className="size-4" />
                {status.label}
            </span>

            <h2 className="mt-4 text-[26px] leading-tight font-extrabold tracking-[-0.03em] first-letter:uppercase sm:text-[32px]">
                {formatLongDate(booking.startsAt, booking.timeZone)} a las {formatTime(booking.startsAt, booking.timeZone)}
            </h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
                {hostName(booking)} · {formatDuration(booking.service.durationMinutes)}
            </p>

            <h3 className="mt-7 text-[19px] font-extrabold tracking-[-0.02em]">Resumen</h3>
            <div className="mt-3 flex items-start justify-between gap-4 text-[14px]">
                <div>
                    <p className="font-bold tracking-[-0.02em]">{booking.service.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">con {booking.employeeName}</p>
                </div>
                <span className="shrink-0 font-bold">{formatPrice(booking.service.price)}</span>
            </div>

            {booking.branch && <p className="mt-4 text-[13.5px] text-muted-foreground">{booking.branch.address}</p>}

            {booking.notes && (
                <>
                    <h4 className="mt-7 text-[17px] font-extrabold tracking-[-0.02em]">Tu comentario</h4>
                    <p className="mt-2 max-w-[62ch] rounded-xl bg-muted p-4 text-[13.5px] leading-relaxed">{booking.notes}</p>
                </>
            )}

            {isActionable(booking, now) && (
                <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
                    <Button variant="outline" onClick={() => setRescheduling(true)}>
                        Reagendar
                    </Button>
                    <Button variant="outline" onClick={() => setCancelling(true)}>
                        Cancelar
                    </Button>
                </div>
            )}

            {cancelling && (
                <CancelConfirm
                    cancel={cancel}
                    onClose={() => setCancelling(false)}
                    onExpired={onExpired}
                    onCancelled={(updated) => {
                        onUpdated(updated);
                        setCancelling(false);
                        setNotice('Cancelamos tu turno.');
                    }}
                />
            )}

            {rescheduling && (
                <RescheduleOverlay
                    booking={booking}
                    reschedule={reschedule}
                    onClose={() => setRescheduling(false)}
                    onExpired={onExpired}
                    onRescheduled={(updated) => {
                        onUpdated(updated);
                        setRescheduling(false);
                        setNotice(
                            updated.status === 'PENDING'
                                ? 'Reagendamos tu turno: como el servicio pide aprobación, vuelve a esperar que lo acepten.'
                                : 'Reagendamos tu turno.',
                        );
                    }}
                />
            )}
        </section>
    );
}

function CancelConfirm({
    cancel,
    onClose,
    onExpired,
    onCancelled,
}: {
    cancel: () => Promise<ClientBookingActionResult>;
    onClose: () => void;
    onExpired?: () => void;
    onCancelled: (booking: ClientBooking) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const confirm = () =>
        startTransition(async () => {
            const result = await cancel();
            if (result.ok) return onCancelled(result.booking);
            if (result.expired && onExpired) return onExpired();
            setError(result.message);
        });

    return (
        <div role="alertdialog" aria-label="Cancelar turno" className="mt-6 rounded-xl border border-border p-4">
            <p className="text-[14px] font-semibold">¿Cancelar este turno? El horario queda libre.</p>
            {error && (
                <p role="alert" className="mt-2 text-[13px] text-muted-foreground">
                    {error}
                </p>
            )}
            <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={pending}>
                    Volver
                </Button>
                <Button onClick={confirm} disabled={pending} className="bg-foreground text-white hover:bg-foreground/90">
                    {pending ? 'Cancelando…' : 'Cancelar turno'}
                </Button>
            </div>
        </div>
    );
}
