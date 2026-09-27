'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ChevronDown, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    PanelButton,
    PanelConfirm,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelInput,
    PanelMenu,
    PanelTextarea,
} from '@/app/(app)/_components/panel-ui';
import { dayKey, formatTime, localInstant, TIME_ZONE_LABEL, type Booking, type BookingTab } from '@/app/(app)/_components/mock-bookings';

type OnChange = (patch: Partial<Booking>) => void;

interface DialogProps {
    booking: Booking;
    now: number;
    onOpenChange: (open: boolean) => void;
    onChange: OnChange;
}

function RescheduleDialog({ booking, now, onOpenChange, onChange }: DialogProps) {
    const [date, setDate] = useState(() => dayKey(booking.startsAt));
    const [time, setTime] = useState(() => formatTime(booking.startsAt));
    const startsAt = date && time ? localInstant(date, time) : null;
    const valid =
        startsAt !== null &&
        !Number.isNaN(startsAt.getTime()) &&
        startsAt.getTime() > now &&
        startsAt.getTime() !== Date.parse(booking.startsAt);

    return (
        <PanelDialog
            open
            onOpenChange={onOpenChange}
            title="Reagendar turno"
            description={`Elegí el nuevo horario. El anterior queda libre y le avisamos a ${booking.clientName}.`}
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form={`reschedule-${booking.id}`} disabled={!valid}>
                        Reagendar
                    </PanelButton>
                </>
            }
        >
            <form
                id={`reschedule-${booking.id}`}
                className="grid gap-5 sm:grid-cols-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!valid || !startsAt) return;
                    const duration = Date.parse(booking.endsAt) - Date.parse(booking.startsAt);
                    onChange({
                        startsAt: startsAt.toISOString(),
                        endsAt: new Date(startsAt.getTime() + duration).toISOString(),
                        rescheduled: true,
                    });
                    toast.success(`Turno de ${booking.clientName} reagendado`);
                    onOpenChange(false);
                }}
            >
                <PanelField label="Fecha" htmlFor={`reschedule-date-${booking.id}`}>
                    <PanelInput id={`reschedule-date-${booking.id}`} type="date" min={dayKey(now)} value={date} onChange={(e) => setDate(e.target.value)} />
                </PanelField>
                <PanelField label="Hora" htmlFor={`reschedule-time-${booking.id}`} hint={`En ${TIME_ZONE_LABEL}.`}>
                    <PanelInput id={`reschedule-time-${booking.id}`} type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
                </PanelField>
            </form>
        </PanelDialog>
    );
}

// ponytail: "Pedir reagendamiento" todavía no está en el glosario (CONTEXT.md); anotarlo con /domain-modeling
// antes de que llegue al back.
function RequestRescheduleDialog({ booking, onOpenChange, onChange }: DialogProps) {
    const [reason, setReason] = useState('');

    return (
        <PanelDialog
            open
            onOpenChange={onOpenChange}
            title="Pedir reagendamiento"
            description={`Esto cancela el turno, le avisa a ${booking.clientName} y le pide que elija otro horario.`}
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cancelar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton
                        onClick={() => {
                            onChange({ status: 'cancelled', rescheduleRequested: true, cancelReason: reason.trim() || undefined });
                            toast.success('Pedido de reagendamiento enviado');
                            onOpenChange(false);
                        }}
                    >
                        Pedir reagendamiento
                    </PanelButton>
                </>
            }
        >
            <PanelField label="Motivo (opcional)" htmlFor={`request-reason-${booking.id}`} hint="Se lo mostramos al cliente.">
                <PanelTextarea id={`request-reason-${booking.id}`} value={reason} onChange={(e) => setReason(e.target.value)} />
            </PanelField>
        </PanelDialog>
    );
}

// ponytail: los cambios viven en el estado de la lista; se reemplazan por server actions cuando exista el endpoint.
export function BookingActions({ booking, tab, now, onChange }: { booking: Booking; tab: BookingTab; now: number; onChange: OnChange }) {
    const router = useRouter();
    const [dialog, setDialog] = useState<'reschedule' | 'request' | 'reject' | null>(null);
    const setOpen = (d: typeof dialog) => (open: boolean) => setDialog(open ? d : null);

    if (tab === 'pending') {
        return (
            <>
                <PanelButton
                    onClick={() => {
                        onChange({ status: 'booked' });
                        toast.success(`Turno de ${booking.clientName} aceptado`);
                    }}
                >
                    Aceptar
                </PanelButton>
                <PanelButton variant="destructive" onClick={() => setDialog('reject')}>
                    Rechazar
                </PanelButton>
                <PanelConfirm
                    open={dialog === 'reject'}
                    onOpenChange={setOpen('reject')}
                    title="¿Rechazar el turno?"
                    description={`El horario queda libre y le avisamos a ${booking.clientName}.`}
                    confirmLabel="Rechazar turno"
                    destructive
                    onConfirm={() => {
                        onChange({ status: 'rejected' });
                        toast.success(`Turno de ${booking.clientName} rechazado`);
                    }}
                />
            </>
        );
    }

    if (tab !== 'upcoming') return null;

    const dialogProps = { booking, now, onChange };
    return (
        <>
            <PanelButton variant="secondary" onClick={() => router.push(`/bookings/${booking.id}?cancelar`)}>
                <X className="size-4" />
                Cancelar
            </PanelButton>
            <PanelMenu
                trigger={
                    <PanelButton variant="secondary">
                        Editar
                        <ChevronDown className="size-4" />
                    </PanelButton>
                }
                items={[
                    { label: 'Reagendar turno', icon: <CalendarClock />, onSelect: () => setDialog('reschedule') },
                    { label: 'Pedir reagendamiento', icon: <Send />, onSelect: () => setDialog('request') },
                ]}
            />
            {dialog === 'reschedule' && <RescheduleDialog {...dialogProps} onOpenChange={setOpen('reschedule')} />}
            {dialog === 'request' && <RequestRescheduleDialog {...dialogProps} onOpenChange={setOpen('request')} />}
        </>
    );
}
