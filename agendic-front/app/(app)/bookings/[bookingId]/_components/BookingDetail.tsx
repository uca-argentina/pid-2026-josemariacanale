'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, Clock, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/_components/utils';
import { PanelButton } from '@/app/(app)/_components/panel-ui';
import { cancelBookingAction } from '@/app/(app)/bookings/actions';
import { formatLongDate, formatTimeRange, isClosed, TIME_ZONE_LABEL, type Booking } from '@/app/(app)/bookings/_components/booking-helpers';

const GREEN = 'bg-[#e6f6ec] text-[#15803d]';
const RED = 'bg-[#fdecec] text-[#b91c1c]';
const AMBER = 'bg-[#fff4e5] text-[#b45309]';
const GRAY = 'bg-[#f3f4f6] text-[#374151]';

function headerOf(b: Booking, past: boolean) {
    switch (b.status) {
        case 'CANCELLED':
            return { icon: X, tone: RED, title: 'Este turno está cancelado' };
        case 'REJECTED':
            return { icon: X, tone: RED, title: 'Este turno fue rechazado' };
        case 'PENDING':
            return past
                ? { icon: Clock, tone: GRAY, title: 'Este turno quedó sin respuesta' }
                : { icon: Clock, tone: AMBER, title: 'Este turno espera tu respuesta', subtitle: 'Aceptalo o rechazalo desde la lista de Turnos.' };
        case 'BOOKED':
            if (b.noShowAt !== null) return { icon: X, tone: RED, title: `${b.clientName} no se presentó` };
            return past
                ? { icon: Check, tone: GRAY, title: 'Este turno ya pasó' }
                : { icon: Check, tone: GREEN, title: 'Este turno está aceptado', subtitle: `Le enviamos la Confirmación de reserva a ${b.clientName}.` };
    }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <>
            <dt className="font-semibold text-[#374151]">{label}</dt>
            <dd className="m-0 flex flex-col gap-0.5 font-medium text-[#0f1b2d]">{children}</dd>
        </>
    );
}

/** Detalle de un Turno del Empleado; Cancelar pega contra el back y la página se refresca con el Turno cancelado. */
export function BookingDetail({ booking, now, startCancelling }: { booking: Booking; now: number; startCancelling: boolean }) {
    const past = Date.parse(booking.endsAt) < now;
    const cancellable = booking.status === 'BOOKED' && booking.noShowAt === null && !past;
    const [cancelling, setCancelling] = useState(startCancelling && cancellable);
    const closed = isClosed(booking);
    const header = headerOf(booking, past);

    const [pending, startTransition] = useTransition();
    const cancel = () =>
        startTransition(async () => {
            const result = await cancelBookingAction(booking.id);
            if (result.ok) toast.success('Turno cancelado');
            else toast.error(result.message);
            setCancelling(false);
        });

    return (
        <div className="flex-1 bg-[#f9fafb] px-4 py-6 text-[#0f1b2d] sm:px-8">
            <Link
                href="/bookings"
                className="inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-[#6b7280] outline-none hover:text-[#0f1b2d] focus-visible:ring-2 focus-visible:ring-[#0f1b2d]"
            >
                <ChevronLeft className="size-4" />
                Volver a Turnos
            </Link>

            <section className="mx-auto mt-6 max-w-[640px] rounded-xl border border-[#e5e7eb] bg-white px-6 py-10 shadow-[0_1px_2px_rgba(15,27,45,0.04)] sm:px-10">
                <div className="flex flex-col items-center gap-3 text-center">
                    <span className={cn('flex size-12 items-center justify-center rounded-full', header.tone)}>
                        <header.icon className="size-5" />
                    </span>
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">{header.title}</h1>
                    {header.subtitle && <p className="m-0 max-w-[420px] text-[13.5px] font-medium text-[#6b7280]">{header.subtitle}</p>}
                </div>

                <dl className="mt-8 grid grid-cols-[110px_1fr] gap-x-6 gap-y-5 border-t border-[#e5e7eb] pt-8 text-[13.5px] sm:grid-cols-[140px_1fr]">
                    <Row label="Qué">{booking.serviceName}</Row>
                    <Row label="Cuándo">
                        <span className={cn('first-letter:uppercase', closed && 'line-through')}>{formatLongDate(booking.startsAt)}</span>
                        <span className={cn(closed && 'line-through')}>
                            {formatTimeRange(booking)} ({TIME_ZONE_LABEL})
                        </span>
                    </Row>
                    <Row label="Quién">
                        <span>{booking.clientName}</span>
                        <a href={`mailto:${booking.clientEmail}`} className="text-[#6b7280] hover:text-[#0f1b2d] hover:underline">
                            {booking.clientEmail}
                        </a>
                    </Row>
                    <Row label="Dónde">{booking.businessName} · Sucursal {booking.branchName}</Row>
                </dl>

                {cancelling ? (
                    <div className="mt-8 flex flex-col gap-3 border-t border-[#e5e7eb] pt-8">
                        <p className="m-0 flex items-center gap-1.5 text-[13.5px] font-medium text-[#374151]">
                            <Info className="size-4" />
                            ¿Cancelar este turno? El horario queda libre.
                        </p>
                        <div className="mt-2 flex justify-end gap-2">
                            <PanelButton variant="secondary" disabled={pending} onClick={() => setCancelling(false)}>
                                Volver
                            </PanelButton>
                            <PanelButton disabled={pending} onClick={cancel}>Cancelar turno</PanelButton>
                        </div>
                    </div>
                ) : (
                    cancellable && (
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-[#e5e7eb] pt-6 text-[13.5px] font-medium text-[#374151]">
                            ¿Hay que hacer un cambio?
                            <button
                                type="button"
                                onClick={() => setCancelling(true)}
                                className="rounded font-bold text-[#0f1b2d] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d]"
                            >
                                Cancelar turno
                            </button>
                        </div>
                    )
                )}
            </section>
        </div>
    );
}
