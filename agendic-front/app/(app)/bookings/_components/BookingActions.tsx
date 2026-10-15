'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, Ellipsis, UserCheck, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelMenu, type PanelMenuItem } from '@/app/(app)/_components/panel-ui';
import {
    acceptBookingAction,
    cancelBookingAction,
    markBookingNoShowAction,
    rejectBookingAction,
    unmarkBookingNoShowAction,
    type BookingActionResult,
} from '../actions';
import { actionsOf, type Booking } from './booking-helpers';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';
import { RescheduleDialog } from './RescheduleDialog';

type Dialog = 'reschedule' | 'reject' | 'cancel' | 'no-show' | 'unmark-no-show' | null;

/**
 * Las acciones de un Turno según su estado (`actionsOf`), en la fila de la lista y en el panel lateral:
 * los botones principales (Aceptar y Rechazar en uno pendiente) y el menú "…" con el resto (Cancelar,
 * Reagendar, Marcar y Desmarcar la Ausencia del Invitado. Rechazar y Cancelar piden un Motivo de cancelaci?n opcional. Cada acci?n pega contra el back y la p?gina se refresca.
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

    const menuItems: Record<'cancel' | 'reschedule' | 'no-show' | 'unmark-no-show', PanelMenuItem> = {
        cancel: { label: 'Cancelar', icon: <X />, destructive: true, onSelect: () => setDialog('cancel') },
        reschedule: { label: 'Reagendar', icon: <CalendarClock />, onSelect: () => setDialog('reschedule') },
        'no-show': { label: 'Marcar Ausencia del Invitado', icon: <UserX />, onSelect: () => setDialog('no-show') },
        'unmark-no-show': { label: 'Desmarcar Ausencia del Invitado', icon: <UserCheck />, onSelect: () => setDialog('unmark-no-show') },
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
                description={`${booking.clientName} no se presentó al turno. Si te equivocás, después la podés desmarcar.`}
                confirmLabel="Marcar Ausencia del Invitado"
                destructive
                onConfirm={() => run(markBookingNoShowAction, `Ausencia del Invitado de ${booking.clientName} marcada`)}
            />
            <PanelConfirm
                open={dialog === 'unmark-no-show'}
                onOpenChange={setOpen('unmark-no-show')}
                title="¿Desmarcar la Ausencia del Invitado?"
                description={`Se borra la marca del turno de ${booking.clientName}. La podés volver a marcar después.`}
                confirmLabel="Desmarcar Ausencia del Invitado"
                onConfirm={() => run(unmarkBookingNoShowAction, `Ausencia del Invitado de ${booking.clientName} desmarcada`)}
            />
            {dialog === 'reschedule' && <RescheduleDialog booking={booking} onOpenChange={setOpen('reschedule')} />}
        </>
    );
}
