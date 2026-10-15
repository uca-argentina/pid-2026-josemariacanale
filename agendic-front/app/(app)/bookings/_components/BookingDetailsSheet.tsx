'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/app/_components/ui/sheet';
import { cn } from '@/app/_components/utils';
import { formatPrice } from '@/app/_components/booking/format';
import { PanelBadge } from '@/app/(app)/_components/panel-ui';
import type { Preferences } from '@/src/entities/models/user';
import { BookingActions } from './BookingActions';
import { BookingHistory } from './BookingHistory';
import { formatLongDate, formatShortDay, formatTimeRange, placeOf, TIME_ZONE_LABEL } from '@/app/(app)/_components/booking-format';
import { cabinOf, cancellationOf, isClosed, statusBadgesOf, type Booking } from './booking-helpers';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-1">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">{title}</h3>
            <div className="flex flex-col gap-0.5 text-[13.5px] font-medium text-[#0f1b2d]">{children}</div>
        </section>
    );
}

/**
 * Panel lateral con el detalle de un Turno. `booking` null lo deja cerrado. `previous` y `next` son los
 * vecinos en lo que la pantalla muestra (null si no hay); ← y → los abren y Esc cierra. Abajo va el Historial del
 * Turno. La Calificación y el Comentario del Turno se suman cuando el Turno los traiga.
 */
export function BookingDetailsSheet({
    booking,
    previous,
    next,
    now,
    preferences,
    onSelect,
    onClose,
}: {
    booking: Booking | null;
    previous: Booking | null;
    next: Booking | null;
    now: number;
    preferences: Preferences;
    onSelect: (id: number) => void;
    onClose: () => void;
}) {
    // Los diálogos de las acciones se montan por un portal, pero sus eventos suben hasta acá: solo cuentan los del panel.
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        const target = event.target as HTMLElement;
        if (!event.currentTarget.contains(target) || target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const neighbour = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : null;
        if (!neighbour) return;
        event.preventDefault();
        onSelect(neighbour.id);
    };

    const cancelled = booking && cancellationOf(booking);

    return (
        <Sheet open={booking !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent showCloseButton className="w-full gap-0 sm:max-w-md" onKeyDown={onKeyDown}>
                {booking && (
                    <>
                        <SheetHeader className="gap-3 border-b border-[#e5e7eb] pr-14">
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="outline" size="icon-sm" aria-label="Turno anterior" disabled={!previous} onClick={() => previous && onSelect(previous.id)}>
                                    <ChevronLeft />
                                </Button>
                                <Button type="button" variant="outline" size="icon-sm" aria-label="Turno siguiente" disabled={!next} onClick={() => next && onSelect(next.id)}>
                                    <ChevronRight />
                                </Button>
                            </div>
                            <SheetTitle className="text-[17px] font-extrabold tracking-[-0.03em]">{booking.serviceName}</SheetTitle>
                            <SheetDescription className="sr-only">Detalle del turno de {booking.clientName}</SheetDescription>
                            <div className="flex flex-wrap gap-1.5">
                                {statusBadgesOf(booking).map((badge) => (
                                    <PanelBadge key={badge.label} className={badge.className}>
                                        {badge.label}
                                    </PanelBadge>
                                ))}
                            </div>
                        </SheetHeader>

                        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
                            <Section title="Cuándo">
                                <span className={cn('first-letter:uppercase', isClosed(booking) && 'line-through')}>{formatLongDate(booking.startsAt)}</span>
                                <span className={cn(isClosed(booking) && 'line-through')}>
                                    {formatTimeRange(booking, preferences.timeFormat)} ({TIME_ZONE_LABEL})
                                </span>
                            </Section>
                            <Section title="Cliente">
                                <span>{booking.clientName}</span>
                                <a href={`mailto:${booking.clientEmail}`} className="text-[#6b7280] hover:text-[#0f1b2d] hover:underline">
                                    {booking.clientEmail}
                                </a>
                            </Section>
                            <Section title="Dónde">
                                <span>{placeOf(booking)}</span>
                                {cabinOf(booking) && <span className="text-[#6b7280]">Cabina {cabinOf(booking)}</span>}
                            </Section>
                            {booking.depositAmount !== null && (
                                <Section title="Seña">
                                    {booking.depositPaidAt === null
                                        ? `${formatPrice(booking.depositAmount)} · pendiente`
                                        : `${formatPrice(booking.depositAmount)} · pagada el ${formatShortDay(booking.depositPaidAt)}`}
                                </Section>
                            )}
                            {cancelled && (
                                <Section title={booking.status === 'REJECTED' ? 'Rechazo' : 'Cancelación'}>
                                    <span>
                                        {booking.status === 'REJECTED' ? 'Rechazado' : 'Cancelado'} por {cancelled.by}
                                    </span>
                                    {cancelled.cause && (
                                        <span>
                                            <PanelBadge className="bg-[#fff4e5] text-[#b45309]">{cancelled.cause}</PanelBadge>
                                        </span>
                                    )}
                                    {cancelled.reason && <span className="text-[#6b7280]">{cancelled.reason}</span>}
                                </Section>
                            )}
                            <BookingHistory booking={booking} timeFormat={preferences.timeFormat} />
                        </div>

                        <SheetFooter className="flex-row justify-end border-t border-[#e5e7eb]">
                            <BookingActions booking={booking} now={now} />
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
