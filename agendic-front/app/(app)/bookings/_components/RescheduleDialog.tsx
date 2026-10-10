'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/_components/utils';
import { PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { formatDate, shortWeekday } from '@/app/_components/booking/format';
import { useSlotWeek } from '@/app/_components/booking/use-slot-week';
import { rescheduleBookingAction } from '../actions';
import { TIME_ZONE_LABEL, type Booking } from './booking-helpers';

const NO_SLOTS_REASON = {
    NOT_WORKING: 'No atendés ese día.',
    FULLY_BOOKED: 'Tenés la agenda completa ese día.',
} as const;

/**
 * Elige el nuevo Horario reservable de un Turno aceptado. Pide al back los horarios del mismo Servicio,
 * de a una semana, igual que la reserva pública, y al confirmar reagenda.
 */
export function RescheduleDialog({ booking, onOpenChange }: { booking: Booking; onOpenChange: (open: boolean) => void }) {
    const { status, message, week, days, label, canGoBack, goToWeek, retry, reload } = useSlotWeek(booking.serviceId, null);
    const [date, setDate] = useState<string | null>(null);
    const [startsAt, setStartsAt] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Al abrir y al cambiar de semana se elige el primer día con lugar, así se ve de entrada si hay horarios.
    if (status === 'ready' && days.length > 0 && !days.some((d) => d.date === date)) {
        setDate((days.find((d) => d.slots.length > 0) ?? days[0]).date);
        setStartsAt(null);
    }

    const chosenDay = days.find((d) => d.date === date);

    const confirm = () => {
        if (!startsAt) return;
        startTransition(async () => {
            const result = await rescheduleBookingAction(booking.id, startsAt);
            if (result.ok) {
                toast.success(`Turno de ${booking.clientName} reagendado`);
                return onOpenChange(false);
            }
            setNotice(result.message);
            if (result.slotTaken) {
                setStartsAt(null);
                reload();
            }
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={onOpenChange}
            title="Reagendar turno"
            description={`Elegí el nuevo horario (${TIME_ZONE_LABEL}). El anterior queda libre.`}
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton onClick={confirm} disabled={!startsAt || pending}>
                        Reagendar
                    </PanelButton>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {notice && (
                    <p role="alert" className="m-0 rounded-md bg-[#f3f4f6] p-3 text-[13px] font-semibold text-[#0f1b2d]">
                        {notice}
                    </p>
                )}

                {label && (
                    <div className="flex items-center justify-between gap-2">
                        <PanelButton variant="secondary" onClick={() => goToWeek(week - 1)} disabled={!canGoBack} aria-label="Semana anterior" className="w-9 px-0 disabled:opacity-50">
                            <ChevronLeft className="size-4" />
                        </PanelButton>
                        <p aria-live="polite" className="m-0 text-[13px] font-bold text-[#0f1b2d]">
                            {label}
                        </p>
                        <PanelButton variant="secondary" onClick={() => goToWeek(week + 1)} aria-label="Semana siguiente" className="w-9 px-0">
                            <ChevronRight className="size-4" />
                        </PanelButton>
                    </div>
                )}

                {status === 'loading' && (
                    <p role="status" className="m-0 text-[13px] font-medium text-[#6b7280]">
                        Buscando horarios…
                    </p>
                )}

                {status === 'error' && (
                    <div role="alert" className="flex flex-col items-start gap-3">
                        <p className="m-0 text-[13px] font-medium text-[#6b7280]">{message}</p>
                        <PanelButton
                            variant="secondary"
                            onClick={retry}
                        >
                            Reintentar
                        </PanelButton>
                    </div>
                )}

                {status === 'ready' && days.length === 0 && (
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">No tenés horarios esta semana.</p>
                )}

                {days.length > 0 && (
                    <ol aria-label="Días" className="m-0 grid list-none grid-cols-7 gap-1 p-0">
                        {days.map((day) => {
                            const active = day.date === date;
                            return (
                                <li key={day.date}>
                                    <button
                                        type="button"
                                        aria-pressed={active}
                                        aria-label={`${formatDate(day.date)}${day.slots.length === 0 ? ', sin horarios' : ''}`}
                                        onClick={() => {
                                            setDate(day.date);
                                            setStartsAt(null);
                                        }}
                                        className={cn(
                                            'flex w-full flex-col items-center rounded-md border py-1.5 text-[13px] font-bold transition-colors',
                                            active ? 'border-[#0f1b2d] bg-[#0f1b2d] text-white' : 'border-[#e5e7eb] hover:border-[#0f1b2d]/40',
                                            day.slots.length === 0 && !active && 'text-[#6b7280] line-through',
                                        )}
                                    >
                                        <span className="text-[11px] font-semibold">{shortWeekday(day.date)}</span>
                                        {Number(day.date.slice(8))}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {chosenDay && chosenDay.slots.length > 0 && (
                    <ol aria-label="Horarios" className="m-0 flex list-none flex-wrap gap-2 p-0">
                        {chosenDay.slots.map((slot) => (
                            <li key={slot.startsAt}>
                                <button
                                    type="button"
                                    aria-pressed={slot.startsAt === startsAt}
                                    onClick={() => setStartsAt(slot.startsAt)}
                                    className={cn(
                                        'rounded-md border px-3 py-1.5 text-[13px] font-bold transition-colors',
                                        slot.startsAt === startsAt ? 'border-[#0f1b2d] bg-[#0f1b2d] text-white' : 'border-[#e5e7eb] hover:border-[#0f1b2d]/40',
                                    )}
                                >
                                    {slot.time}
                                </button>
                            </li>
                        ))}
                    </ol>
                )}

                {chosenDay && chosenDay.slots.length === 0 && (
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">{NO_SLOTS_REASON[chosenDay.reason ?? 'NOT_WORKING']}</p>
                )}
            </div>
        </PanelDialog>
    );
}
