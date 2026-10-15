'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, Ellipsis, ListX, UserCheck, UserX, X } from 'lucide-react';
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

type Dialog = 'reschedule' | 'reject' | 'cancel' | 'cancel-following' | 'no-show' | 'unmark-no-show' | null;

/**
 * Las acciones de un Turno según su estado (`actionsOf`), en la fila de la lista y en el panel lateral:
 * los botones principales (Aceptar y Rechazar en uno pendiente) y el menú "…" con el resto (Cancelar,
 * Reagendar, Marcar y Desmarcar la Ausencia del Invitado. Rechazar y Cancelar piden un Motivo de cancelación opcional. Cada acción pega contra el back y la página se refresca.
 *
 * Con `seriesPending` (un Turno pendiente que representa a su Serie en Pendientes), Aceptar y Rechazar van sobre los
 * N Turnos pendientes de la Serie. Con `canCancelFollowing`, el menú suma "Cancelar este y los siguientes".
 */
export function BookingActions({
    booking,
    now,
    seriesPending = null,
    canCancelFollowing = false,
}: {
    booking: Booking;
    now: number;
    seriesPending?: number | null;
    canCancelFollowing?: boolean;
}) {
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

    const series = seriesPending !== null;
    const menuItems: Record<'cancel' | 'reschedule' | 'no-show' | 'unmark-no-show', PanelMenuItem> = {
        cancel: { label: 'Cancelar', icon: <X />, destructive: true, onSelect: () => setDialog('cancel') },
        reschedule: { label: 'Reagendar', icon: <CalendarClock />, onSelect: () => setDialog('reschedule') },
        'no-show': { label: 'Marcar Ausencia del Invitado', icon: <UserX />, onSelect: () => setDialog('no-show') },
        'unmark-no-show': { label: 'Desmarcar Ausencia del Invitado', icon: <UserCheck />, onSelect: () => setDialog('unmark-no-show') },
    };

    return (
        <>
            {main.includes('accept') && (
                <PanelButton
                    disabled={pending}
                    onClick={() =>
                        series
                            ? run((id) => acceptBookingAction(id, true), `Serie de ${booking.clientName} aceptada`)
                            : run(acceptBookingAction, `Turno de ${booking.clientName} aceptado`)
                    }
                >
                    {series ? `Aceptar la Serie (${seriesPending} Turnos)` : 'Aceptar'}
                </PanelButton>
            )}
            {main.includes('reject') && (
                <PanelButton variant="destructive" disabled={pending} onClick={() => setDialog('reject')}>
                    {series ? 'Rechazar la Serie' : 'Rechazar'}
                </PanelButton>
            )}
            {menu.length > 0 && (
                <PanelMenu
                    trigger={
                        <PanelButton variant="secondary" aria-label="Más acciones" disabled={pending} className="w-9 px-0">
                            <Ellipsis className="size-4" />
                        </PanelButton>
                    }
                    items={menu.flatMap((id) => [
                        menuItems[id as keyof typeof menuItems],
                        ...(id === 'cancel' && canCancelFollowing
                            ? [{ label: 'Cancelar este y los siguientes', icon: <ListX />, destructive: true, onSelect: () => setDialog('cancel-following') }]
                            : []),
                    ])}
                />
            )}
            <ReasonConfirmDialog
                open={dialog === 'reject'}
                onOpenChange={setOpen('reject')}
                title={series ? '¿Rechazar la Serie?' : '¿Rechazar el turno?'}
                description={
                    series
                        ? `Se rechazan sus ${seriesPending} turnos pendientes, los horarios quedan libres y le avisamos a ${booking.clientName}.`
                        : `El horario queda libre y le avisamos a ${booking.clientName}.`
                }
                confirmLabel={series ? 'Rechazar la Serie' : 'Rechazar turno'}
                confirm={(reason) => rejectBookingAction(booking.id, reason, series)}
                success={series ? `Serie de ${booking.clientName} rechazada` : `Turno de ${booking.clientName} rechazado`}
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
            <ReasonConfirmDialog
                open={dialog === 'cancel-following'}
                onOpenChange={setOpen('cancel-following')}
                title="¿Cancelar este turno y los siguientes?"
                description={`Se cancelan este turno y los siguientes de la Serie, los horarios quedan libres y le avisamos a ${booking.clientName}.`}
                confirmLabel="Cancelar los turnos"
                confirm={(reason) => cancelBookingAction(booking.id, reason, true)}
                success="Turnos cancelados"
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
