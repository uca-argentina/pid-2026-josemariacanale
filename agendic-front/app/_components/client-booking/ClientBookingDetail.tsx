'use client';

import { useState, useTransition } from 'react';
import { formatPrice as formatPriceWithCents } from '@/app/_components/booking/format';
import Link from 'next/link';
import { Button } from '@/app/_components/ui/button';
import { bookingPath } from '@/app/routes';
import { Textarea } from '@/app/_components/ui/textarea';
import { CANCELLATION_REASON_MAX_LENGTH } from '@/src/entities/models/booking';
import {
    STATUS_BADGE,
    canPayDeposit,
    cancellationReasonOf,
    hasFollowingInSeries,
    hasPendingDeposit,
    hostName,
    isActionable,
    keptNotice,
    seriesOf,
} from './client-booking-helpers';
import { formatDuration, formatLongDate, formatPrice, formatTime } from './format';
import { RatingSection } from './RatingSection';
import { RescheduleOverlay } from './RescheduleOverlay';
import type { ClientBooking, ClientBookingActionResult } from './types';

/**
 * Muestra el detalle de un Turno del Cliente, con Pagar seña, Reagendar y Cancelar abajo cuando todavía se puede, la lista
 * de su Serie si es de una (cada Turno con su estado y su Enlace del Turno), y el aviso de
 * que quien lo atiende no vino (Ausencia del Anfitrión) cuando el back lo permite, y la Calificación (formulario o solo lectura).
 * Quien lo usa pasa sus propias acciones en `payDeposit`, `cancel`, `reschedule`, `markEmployeeNoShow` y `rate`.
 */
export function ClientBookingDetail({
    booking,
    now,
    payDeposit,
    cancel,
    reschedule,
    markEmployeeNoShow,
    rate,
    onUpdated,
}: {
    booking: ClientBooking;
    now: number;
    payDeposit: () => Promise<ClientBookingActionResult>;
    /**
     * Cancela con el Motivo de cancelación que escribió el Cliente (`undefined` si lo dejó vacío); con `andFollowing`,
     * también los siguientes de la Serie.
     */
    cancel: (reason: string | undefined, andFollowing: boolean) => Promise<ClientBookingActionResult>;
    reschedule: (startsAt: string) => Promise<ClientBookingActionResult>;
    markEmployeeNoShow: () => Promise<ClientBookingActionResult>;
    rate: (score: number, comment?: string) => Promise<ClientBookingActionResult>;
    onUpdated: (booking: ClientBooking) => void;
}) {
    const [rescheduling, setRescheduling] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [payingDeposit, setPayingDeposit] = useState(false);
    const [markingNoShow, setMarkingNoShow] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const status = STATUS_BADGE[booking.status];
    const cancellationReason = cancellationReasonOf(booking);
    const series = seriesOf(booking);

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

            {cancellationReason && (
                <div className="mt-5 rounded-xl bg-muted p-4">
                    <p className="text-[13px] font-bold">Motivo</p>
                    <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed">{cancellationReason}</p>
                </div>
            )}

            <h3 className="mt-7 text-[19px] font-extrabold tracking-[-0.02em]">Resumen</h3>
            <div className="mt-3 flex items-start justify-between gap-4 text-[14px]">
                <div>
                    <p className="font-bold tracking-[-0.02em]">{booking.service.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">con {booking.employeeName}</p>
                </div>
                <span className="shrink-0 font-bold">{formatPrice(booking.service.price)}</span>
            </div>

            {booking.depositAmount !== null && (
                <p className="mt-3 text-[14px] font-semibold">
                    Seña {formatPriceWithCents(booking.depositAmount)} · {hasPendingDeposit(booking) ? 'pendiente' : 'pagada'}
                </p>
            )}

            {booking.employeeNoShowAt !== null && (
                <p className="mt-3 text-[14px] font-semibold">Ausencia del Anfitrión: marcaste que {booking.employeeName} no vino</p>
            )}

            {booking.branch && <p className="mt-4 text-[13.5px] text-muted-foreground">{booking.branch.address}</p>}

            {series && (
                <section aria-label="Tu Serie de turnos">
                    <h4 className="mt-7 text-[17px] font-extrabold tracking-[-0.02em]">Tu Serie ({series.length} turnos)</h4>
                    <ol className="mt-3 flex flex-col gap-2">
                        {series.map((s) => (
                            <li key={s.link} className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 text-[13.5px]">
                                <span className="font-bold first-letter:uppercase">
                                    {formatLongDate(s.startsAt, booking.timeZone)} a las {formatTime(s.startsAt, booking.timeZone)}
                                </span>
                                <span className="flex shrink-0 items-center gap-3">
                                    <span className="text-muted-foreground">{s.status}</span>
                                    {s.current ? (
                                        <span className="font-semibold">Este turno</span>
                                    ) : (
                                        <Link href={bookingPath(s.link)} className="font-semibold underline underline-offset-2">
                                            Ver turno
                                        </Link>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {booking.notes && (
                <>
                    <h4 className="mt-7 text-[17px] font-extrabold tracking-[-0.02em]">Tu comentario</h4>
                    <p className="mt-2 max-w-[62ch] rounded-xl bg-muted p-4 text-[13.5px] leading-relaxed">{booking.notes}</p>
                </>
            )}

            {isActionable(booking, now) && (
                <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
                    {canPayDeposit(booking, now) && (
                        <Button onClick={() => setPayingDeposit(true)} className="bg-foreground text-white hover:bg-foreground/90">
                            Pagar seña
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setRescheduling(true)}>
                        Reagendar
                    </Button>
                    <Button variant="outline" onClick={() => setCancelling(true)}>
                        Cancelar
                    </Button>
                </div>
            )}

            {booking.canMarkEmployeeNoShow && (
                <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
                    <Button variant="outline" onClick={() => setMarkingNoShow(true)}>
                        {booking.employeeName} no vino
                    </Button>
                </div>
            )}

            <RatingSection booking={booking} rate={rate} onUpdated={onUpdated} onNotice={setNotice} />

            {markingNoShow && (
                <MarkEmployeeNoShowConfirm
                    employeeName={booking.employeeName}
                    markEmployeeNoShow={markEmployeeNoShow}
                    onClose={() => setMarkingNoShow(false)}
                    onMarked={(updated) => {
                        onUpdated(updated);
                        setMarkingNoShow(false);
                    }}
                />
            )}

            {payingDeposit && (
                <PayDepositConfirm
                    payDeposit={payDeposit}
                    onClose={() => setPayingDeposit(false)}
                    onPaid={(updated) => {
                        onUpdated(updated);
                        setPayingDeposit(false);
                        setNotice('Seña pagada.');
                    }}
                />
            )}

            {cancelling && (
                <CancelConfirm
                    cancel={cancel}
                    offerFollowing={hasFollowingInSeries(booking)}
                    onClose={() => setCancelling(false)}
                    onCancelled={(updated, kept) => {
                        onUpdated(updated);
                        setCancelling(false);
                        setNotice(kept ? keptNotice(kept, booking.timeZone) : 'Cancelamos tu turno.');
                    }}
                />
            )}

            {rescheduling && (
                <RescheduleOverlay
                    booking={booking}
                    reschedule={reschedule}
                    onClose={() => setRescheduling(false)}
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

function PayDepositConfirm({
    payDeposit,
    onClose,
    onPaid,
}: {
    payDeposit: () => Promise<ClientBookingActionResult>;
    onClose: () => void;
    onPaid: (booking: ClientBooking) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const confirm = () =>
        startTransition(async () => {
            const result = await payDeposit();
            if (result.ok) return onPaid(result.booking);
            setError(result.message);
        });

    return (
        <div role="alertdialog" aria-label="Pagar seña" className="mt-6 rounded-xl border border-border p-4">
            <p className="text-[14px] font-semibold">¿Pagar la seña? El pago es simulado: Agendic no cobra.</p>
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
                    {pending ? 'Pagando…' : 'Pagar seña'}
                </Button>
            </div>
        </div>
    );
}

function MarkEmployeeNoShowConfirm({
    employeeName,
    markEmployeeNoShow,
    onClose,
    onMarked,
}: {
    employeeName: string;
    markEmployeeNoShow: () => Promise<ClientBookingActionResult>;
    onClose: () => void;
    onMarked: (booking: ClientBooking) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const confirm = () =>
        startTransition(async () => {
            const result = await markEmployeeNoShow();
            if (result.ok) return onMarked(result.booking);
            setError(result.message);
        });

    return (
        <div role="alertdialog" aria-label="Marcar la Ausencia del Anfitrión" className="mt-6 rounded-xl border border-border p-4">
            <p className="text-[14px] font-semibold">¿Marcar la Ausencia del Anfitrión de {employeeName}? No se puede deshacer.</p>
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
                    {pending ? 'Marcando…' : 'Marcar la Ausencia del Anfitrión'}
                </Button>
            </div>
        </div>
    );
}

/**
 * Confirma Cancelar con un Motivo de cancelación opcional; un Motivo demasiado largo queda marcado bajo el campo. Con
 * `offerFollowing`, el Cliente elige entre Cancelar solo este Turno o "este y los siguientes" de su Serie; `kept` son
 * los que en ese caso quedaron en pie.
 */
function CancelConfirm({
    cancel,
    offerFollowing,
    onClose,
    onCancelled,
}: {
    cancel: (reason: string | undefined, andFollowing: boolean) => Promise<ClientBookingActionResult>;
    offerFollowing: boolean;
    onClose: () => void;
    onCancelled: (booking: ClientBooking, kept?: { startsAt: string }[]) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [andFollowing, setAndFollowing] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [reasonError, setReasonError] = useState<string | null>(null);

    const confirm = () =>
        startTransition(async () => {
            setError(null);
            const result = await cancel(reason.trim() || undefined, andFollowing);
            if (result.ok) return onCancelled(result.booking, result.kept);
            if (result.field === 'reason') return setReasonError(result.message);
            setError(result.message);
        });

    return (
        <div role="alertdialog" aria-label="Cancelar turno" className="mt-6 rounded-xl border border-border p-4">
            <p className="text-[14px] font-semibold">¿Cancelar este turno? El horario queda libre.</p>
            {offerFollowing && (
                <fieldset className="mt-4 flex flex-col gap-2 text-[13.5px]">
                    <legend className="sr-only">Qué turnos de la Serie cancelar</legend>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="cancel-scope" checked={!andFollowing} onChange={() => setAndFollowing(false)} disabled={pending} />
                        Solo este turno
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="cancel-scope" checked={andFollowing} onChange={() => setAndFollowing(true)} disabled={pending} />
                        Este y los siguientes de la Serie
                    </label>
                </fieldset>
            )}
            <label htmlFor="cancel-reason" className="mt-4 block text-[13px] font-bold">
                Motivo <span className="font-medium text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
                id="cancel-reason"
                value={reason}
                maxLength={CANCELLATION_REASON_MAX_LENGTH}
                disabled={pending}
                onChange={(event) => {
                    setReason(event.target.value);
                    setReasonError(null);
                }}
                aria-invalid={reasonError ? true : undefined}
                aria-describedby={reasonError ? 'cancel-reason-error' : undefined}
                className="mt-1.5"
            />
            {reasonError && (
                <p id="cancel-reason-error" role="alert" className="mt-1.5 text-[13px] font-semibold text-destructive">
                    {reasonError}
                </p>
            )}
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
