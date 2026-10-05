'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/app/_components/utils';
import { PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { listSlotsAction, type ListSlotsResult } from '@/app/business/[negocioSlug]/[sucursalSlug]/actions';
import { addDays, formatDate, shortWeekday } from '@/app/business/[negocioSlug]/[sucursalSlug]/_components/format';
import { rescheduleBookingAction } from '../actions';
import { dayKey, TIME_ZONE_LABEL, type Booking } from './booking-helpers';

/** Dos semanas desde hoy: entra en el máximo de 31 días que acepta el back. */
const DAYS_SHOWN = 14;

const NO_SLOTS_REASON = {
    NOT_WORKING: 'No atendés ese día.',
    FULLY_BOOKED: 'Tenés la agenda completa ese día.',
} as const;

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; days: Extract<ListSlotsResult, { ok: true }>['days'] };

/**
 * Elige el nuevo Horario reservable de un Turno aceptado. Pide al back los horarios del mismo Servicio
 * y Empleado, igual que la reserva pública, y al confirmar reagenda. Quien lo monta necesita `employeeId`.
 */
export function RescheduleDialog({ booking, employeeId, now, onOpenChange }: { booking: Booking; employeeId: number; now: number; onOpenChange: (open: boolean) => void }) {
    const [load, setLoad] = useState<Load>({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);
    const [date, setDate] = useState<string | null>(null);
    const [startsAt, setStartsAt] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        let current = true;
        const from = dayKey(now);
        listSlotsAction({ serviceId: booking.serviceId, employeeId, from, to: addDays(from, DAYS_SHOWN - 1) }).then(
            (result) => {
                if (!current) return;
                if (!result.ok) return setLoad({ status: 'error', message: result.message });
                setLoad({ status: 'ready', days: result.days });
                setDate((chosen) => chosen ?? (result.days.find((d) => d.slots.length > 0) ?? result.days[0])?.date ?? null);
            },
            () => current && setLoad({ status: 'error', message: 'No pudimos cargar los horarios. Intentá de nuevo.' }),
        );
        return () => {
            current = false;
        };
    }, [attempt, booking.serviceId, employeeId, now]);

    const days = load.status === 'ready' ? load.days : [];
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
                setLoad({ status: 'loading' });
                setAttempt((a) => a + 1);
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

                {load.status === 'loading' && (
                    <p role="status" className="m-0 text-[13px] font-medium text-[#6b7280]">
                        Buscando horarios…
                    </p>
                )}

                {load.status === 'error' && (
                    <div role="alert" className="flex flex-col items-start gap-3">
                        <p className="m-0 text-[13px] font-medium text-[#6b7280]">{load.message}</p>
                        <PanelButton
                            variant="secondary"
                            onClick={() => {
                                setLoad({ status: 'loading' });
                                setAttempt((a) => a + 1);
                            }}
                        >
                            Reintentar
                        </PanelButton>
                    </div>
                )}

                {load.status === 'ready' && days.length === 0 && (
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">No tenés horarios en las próximas dos semanas.</p>
                )}

                {days.length > 0 && (
                    <ol aria-label="Días" className="m-0 flex list-none flex-wrap gap-2 p-0">
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
                                            'flex w-[52px] flex-col items-center rounded-md border py-1.5 text-[13px] font-bold transition-colors',
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
