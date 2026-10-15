'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, Ellipsis, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelMenu, type PanelMenuItem } from '@/app/(app)/_components/panel-ui';
import { acceptBookingAction, cancelBookingAction, markBookingNoShowAction, rejectBookingAction, type BookingActionResult } from '../actions';
import { actionsOf, type Booking } from './booking-helpers';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';
import { RescheduleDialog } from './RescheduleDialog';

type Dialog = 'reschedule' | 'reject' | 'cancel' | 'no-show' | null;

/**
 * Las acciones de un Turno según su estado (`actionsOf`), en la fila de la lista y en el panel lateral:
 * los botones principales (Aceptar y Rechazar en uno pendiente) y el menú "…" con el resto (Cancelar,
 * Reagendar, Marcar ausencia). Rechazar y Cancelar piden un Motivo de cancelación opcional. Cada una pega contra el back
 * y la página se refresca.
 */
export function BookingActions({ booking, now }: { booking: Booking; now: number }) {
    const [dialog, setDialog] = useState<Dialog>(null);
    const [pending, startTransition] = useTransition();
    const setOpen = (d: Dialog) => (open: boolean) => setDialog(open ? d : null);
    const { main, menu } = actionsOf(booking, now);

    const run = (action: (id: number) => Promise<BookingActionResult>, success: string) =>
        startTransition(async () => {
            const result = await action(booking.id);
            if (result.ok) toast.success(success);
            else toast.error(result.message);
        });

    const menuItems: Record<'cancel' | 'reschedule' | 'no-show', PanelMenuItem> = {
        cancel: { label: 'Cancelar', icon: <X />, destructive: true, onSelect: () => setDialog('cancel') },
        reschedule: { label: 'Reagendar', icon: <CalendarClock />, onSelect: () => setDialog('reschedule') },
        'no-show': { label: 'Marcar Ausencia del Invitado', icon: <UserX />, onSelect: () => setDialog('no-show') },
    };

    return (
        <>
            {main.includes('accept') && (
                <PanelButton disabled={pending} onClick={() => run(acceptBookingAction, `Turno de ${booking.clientName} aceptado`)}>
                    Aceptar
                </PanelButton>
            )}
            {main.includes('reject') && (
                <PanelButton variant="destructive" disabled={pending} onClick={() => setDialog('reject')}>
                    Rechazar
                </PanelButton>
            )}
            {menu.length > 0 && (
                <PanelMenu
                    trigger={
                        <PanelButton variant="secondary" aria-label="Más acciones" disabled={pending} className="w-9 px-0">
                            <Ellipsis className="size-4" />
                        </PanelButton>
                    }
                    items={menu.map((id) => menuItems[id as keyof typeof menuItems])}
                />
            )}
            <ReasonConfirmDialog
                open={dialog === 'reject'}
                onOpenChange={setOpen('reject')}
                title="¿Rechazar el turno?"
                description={`El horario queda libre y le avisamos a ${booking.clientName}.`}
                confirmLabel="Rechazar turno"
                confirm={(reason) => rejectBookingAction(booking.id, reason)}
                success={`Turno de ${booking.clientName} rechazado`}
            />
            <ReasonConfirmDialog
                open={dialog === 'cancel'}
                onOpenChange={setOpen('cancel')}
                title="¿Cancelar el turno?"
                description={`El horario queda libre y le avisamos a ${booking.clientName}.`}
                confirmLabel="Cancelar turno"
                confirm={(reason) => cancelBookingAction(booking.id, reason)}
                success="Turno cancelado"
            />
            <PanelConfirm
                open={dialog === 'no-show'}
                onOpenChange={setOpen('no-show')}
                title="¿Marcar la Ausencia del Invitado?"
                description={`${booking.clientName} no se presentó al turno. No se puede deshacer.`}
                confirmLabel="Marcar Ausencia del Invitado"
                destructive
                onConfirm={() => run(markBookingNoShowAction, `Ausencia del Invitado de ${booking.clientName} marcada`)}
            />
            {dialog === 'reschedule' && <RescheduleDialog booking={booking} onOpenChange={setOpen('reschedule')} />}
        </>
    );
}
