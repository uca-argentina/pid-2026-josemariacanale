'use client';

import { useState, useTransition } from 'react';
import { MapPin, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { PanelBadge, PanelButton } from '@/app/(app)/_components/panel-ui';
import { formatShortDay, formatTime, placeOf } from '@/app/(app)/_components/booking-format';
import type { Preferences } from '@/src/entities/models/user';
import { acceptBookingAction, cancelBookingAction, rejectBookingAction } from '../actions';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';
import { seriesFrequency, type SeriesRow } from './series-helpers';

/**
 * Las acciones de una fila de la pestaña Series: Aceptar o Rechazar la Serie si tiene Turnos pendientes, y Cancelar
 * los restantes desde el primero aceptado por venir. Rechazar y Cancelar piden un Motivo de cancelación opcional.
 */
function SeriesActions({ row }: { row: SeriesRow }) {
    const [dialog, setDialog] = useState<'reject' | 'cancel' | null>(null);
    const [pending, startTransition] = useTransition();
    const { firstPending, firstBooked } = row;
    const { clientName } = row.next;

    const accept = (id: number) =>
        startTransition(async () => {
            const result = await acceptBookingAction(id, true);
            if (result.ok) toast.success(`Serie de ${clientName} aceptada`);
            else toast.error(result.message);
        });

    return (
        <>
            {firstPending && (
                <>
                    <PanelButton disabled={pending} onClick={() => accept(firstPending.id)}>
                        Aceptar la Serie
                    </PanelButton>
                    <PanelButton variant="destructive" disabled={pending} onClick={() => setDialog('reject')}>
                        Rechazar la Serie
                    </PanelButton>
                </>
            )}
            {firstBooked && (
                <PanelButton variant="secondary" disabled={pending} onClick={() => setDialog('cancel')}>
                    Cancelar los restantes
                </PanelButton>
            )}
            {firstPending && (
                <ReasonConfirmDialog
                    open={dialog === 'reject'}
                    onOpenChange={(open) => setDialog(open ? 'reject' : null)}
                    title="¿Rechazar la Serie?"
                    description={`Se rechazan sus ${row.pending} turnos pendientes, los horarios quedan libres y le avisamos a ${clientName}.`}
                    confirmLabel="Rechazar la Serie"
                    confirm={(reason) => rejectBookingAction(firstPending.id, reason, true)}
                    success={`Serie de ${clientName} rechazada`}
                />
            )}
            {firstBooked && (
                <ReasonConfirmDialog
                    open={dialog === 'cancel'}
                    onOpenChange={(open) => setDialog(open ? 'cancel' : null)}
                    title="¿Cancelar los turnos restantes?"
                    description={`Se cancelan los turnos de la Serie desde el ${formatShortDay(firstBooked.startsAt)}, los horarios quedan libres y le avisamos a ${clientName}.`}
                    confirmLabel="Cancelar los turnos"
                    confirm={(reason) => cancelBookingAction(firstBooked.id, reason, true)}
                    success="Turnos cancelados"
                />
            )}
        </>
    );
}

/**
 * La pestaña Series de Mis turnos: una fila por Serie con Turnos por venir, con el Servicio, el Cliente, cada cuánto se
 * repite y cuántos Turnos le quedan. El clic abre el panel del próximo Turno.
 */
export function SeriesList({ rows, timeFormat, onOpen }: { rows: SeriesRow[]; timeFormat: Preferences['timeFormat']; onOpen: (id: number) => void }) {
    return (
        <ul className="m-0 mt-4 list-none divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] p-0">
            {rows.map((row) => (
                <li key={row.seriesId} className="flex flex-wrap items-start gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
                    <button
                        type="button"
                        onClick={() => onOpen(row.next.id)}
                        className="flex min-w-0 flex-1 basis-[420px] cursor-pointer flex-col gap-1 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4"
                    >
                        <span className="flex items-center gap-1.5 text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                            <Repeat className="size-3.5 shrink-0" aria-label="Serie" />
                            {row.next.serviceName} con {row.next.clientName}
                        </span>
                        <span className="text-[13px] font-medium text-[#374151] first-letter:uppercase">{seriesFrequency(row.bookings, timeFormat)}</span>
                        <span className="text-[12.5px] font-semibold text-[#6b7280]">
                            Quedan {row.remaining} de {row.total} · próximo el {formatShortDay(row.next.startsAt)} a las {formatTime(row.next.startsAt, timeFormat)}
                        </span>
                        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6b7280]">
                            <MapPin className="size-3.5" />
                            {placeOf(row.next)}
                        </span>
                        {row.pending > 0 && (
                            <span className="mt-1">
                                <PanelBadge className="bg-[#fff4e5] text-[#b45309]">{row.pending} pendientes</PanelBadge>
                            </span>
                        )}
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <SeriesActions row={row} />
                    </div>
                </li>
            ))}
        </ul>
    );
}
