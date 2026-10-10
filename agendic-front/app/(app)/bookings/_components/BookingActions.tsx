'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm } from '@/app/(app)/_components/panel-ui';
import { acceptBookingAction, markBookingNoShowAction, rejectBookingAction, type BookingActionResult } from '../actions';
import type { Booking, BookingTab } from './booking-helpers';
import { RescheduleDialog } from './RescheduleDialog';

type Dialog = 'reschedule' | 'reject' | 'no-show' | null;

/**
 * Las acciones de un Turno en la lista, según su pestaña: Aceptar y Rechazar en Pendientes; Cancelar
 * y Reagendar en Próximos; Ausencia en Pasados. Cada una pega contra el back y la página se refresca.
 */
export function BookingActions({ booking, tab }: { booking: Booking; tab: BookingTab }) {
    const router = useRouter();
    const [dialog, setDialog] = useState<Dialog>(null);
    const [pending, startTransition] = useTransition();
    const setOpen = (d: Dialog) => (open: boolean) => setDialog(open ? d : null);

    const run = (action: (id: number) => Promise<BookingActionResult>, success: string) =>
        startTransition(async () => {
            const result = await action(booking.id);
            if (result.ok) toast.success(success);
            else toast.error(result.message);
        });

    if (tab === 'pending') {
        return (
            <>
                <PanelButton disabled={pending} onClick={() => run(acceptBookingAction, `Turno de ${booking.clientName} aceptado`)}>
                    Aceptar
                </PanelButton>
                <PanelButton variant="destructive" disabled={pending} onClick={() => setDialog('reject')}>
                    Rechazar
                </PanelButton>
                <PanelConfirm
                    open={dialog === 'reject'}
                    onOpenChange={setOpen('reject')}
                    title="¿Rechazar el turno?"
                    description={`El horario queda libre y le avisamos a ${booking.clientName}.`}
                    confirmLabel="Rechazar turno"
                    destructive
                    onConfirm={() => run(rejectBookingAction, `Turno de ${booking.clientName} rechazado`)}
                />
            </>
        );
    }

    if (tab === 'past' && booking.noShowAt === null) {
        return (
            <>
                <PanelButton variant="secondary" disabled={pending} onClick={() => setDialog('no-show')}>
                    <UserX className="size-4" />
                    Marcar ausencia
                </PanelButton>
                <PanelConfirm
                    open={dialog === 'no-show'}
                    onOpenChange={setOpen('no-show')}
                    title="¿Marcar la ausencia?"
                    description={`${booking.clientName} no se presentó al turno. No se puede deshacer.`}
                    confirmLabel="Marcar ausencia"
                    destructive
                    onConfirm={() => run(markBookingNoShowAction, `Ausencia de ${booking.clientName} marcada`)}
                />
            </>
        );
    }

    if (tab !== 'upcoming') return null;

    return (
        <>
            <PanelButton variant="secondary" onClick={() => router.push(`/bookings/${booking.id}?cancelar`)}>
                <X className="size-4" />
                Cancelar
            </PanelButton>
            <PanelButton variant="secondary" onClick={() => setDialog('reschedule')}>
                <CalendarClock className="size-4" />
                Reagendar
            </PanelButton>
            {dialog === 'reschedule' && (
                <RescheduleDialog booking={booking} onOpenChange={setOpen('reschedule')} />
            )}
        </>
    );
}
