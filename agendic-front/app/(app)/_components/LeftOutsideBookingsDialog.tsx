'use client';

import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import type { Preferences } from '@/src/entities/models/user';
import { formatTimeRange, placeOf } from './booking-format';
import { commonCancellationReason, groupLeftOutsideByDay, turnosCount } from './left-outside-bookings';

/**
 * Los Turnos que un cambio en el horario del Usuario deja afuera, agrupados por día, para que elija entre
 * "Volver" y cancelarlos y guardar. Lo reusan todas las pantallas que guardan un cambio de horario.
 *
 * @param timeFormat formato de hora que eligió el Usuario
 * @param pending hay una vista previa o un guardado en curso
 * @param onBack cierra el diálogo y deja abierto el formulario
 * @param onConfirm guarda y cancela los Turnos que se muestran
 */
export function LeftOutsideBookingsDialog({
    bookings,
    timeFormat,
    pending,
    onBack,
    onConfirm,
}: {
    bookings: LeftOutsideBooking[];
    timeFormat: Preferences['timeFormat'];
    pending: boolean;
    onBack: () => void;
    onConfirm: () => void;
}) {
    const [now] = useState(() => Date.now());
    const days = groupLeftOutsideByDay(bookings, now);
    const commonReason = commonCancellationReason(bookings);

    return (
        <Dialog open onOpenChange={(open) => !open && !pending && onBack()}>
            <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{`¿Cancelar ${turnosCount(bookings.length)}?`}</DialogTitle>
                    <DialogDescription>Estos Turnos quedan fuera de tu horario. Les avisamos por mail a los Clientes.</DialogDescription>
                </DialogHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto" data-testid="left-outside-bookings">
                    {days.map((day) => (
                        <section key={day.key} className="flex flex-col gap-2">
                            <h3 className="m-0 text-sm font-medium capitalize">{day.label}</h3>
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {day.bookings.map((booking) => (
                                    <li key={booking.id} className="rounded-lg border p-2">
                                        <p className="m-0 font-medium">{formatTimeRange(booking, timeFormat)}</p>
                                        <p className="m-0">
                                            {booking.serviceName} · {booking.clientName}
                                        </p>
                                        <p className="m-0 text-muted-foreground">{placeOf(booking)}</p>
                                    </li>
                                ))}
                            </ul>
                            {commonReason === null && (
                                <p className="m-0 text-muted-foreground">
                                    El Cliente va a ver: {day.reasons.join(' / ')}
                                </p>
                            )}
                        </section>
                    ))}
                    {commonReason !== null && (
                        <div className="flex flex-col gap-1">
                            <p className="m-0 font-medium">El Cliente va a ver:</p>
                            <p className="m-0 text-muted-foreground">{commonReason}</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={pending} onClick={onBack}>
                        Volver
                    </Button>
                    <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
                        {`Cancelar ${turnosCount(bookings.length)} y guardar`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
