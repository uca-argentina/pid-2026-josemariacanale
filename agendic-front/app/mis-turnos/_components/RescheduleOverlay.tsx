'use client';

import { useState, useTransition } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { TimeStep } from '@/app/_components/booking/TimeStep';
import type { Service, Slot } from '@/app/_components/booking/types';
import { rescheduleClientBookingAction, type ClientBooking } from '../actions';

/**
 * Elige el nuevo Horario reservable de un Turno y reagenda. Reusa `TimeStep`, el mismo paso que
 * Reservar: `service` solo necesita `id` y `durationMinutes`, así que arma uno mínimo con los
 * datos que trae el Turno.
 */
export function RescheduleOverlay({
    access,
    booking,
    onClose,
    onExpired,
    onRescheduled,
}: {
    access: string;
    booking: ClientBooking;
    onClose: () => void;
    onExpired: () => void;
    onRescheduled: (booking: ClientBooking) => void;
}) {
    const [slot, setSlot] = useState<Slot | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // TimeStep solo lee id y durationMinutes: el resto no aplica a un Turno ya reservado.
    const service = {
        id: booking.serviceId,
        name: booking.service.name,
        description: null,
        category: 'OTRO',
        durationMinutes: booking.service.durationMinutes,
        price: booking.service.price,
        depositPercent: booking.service.depositPercent,
    } as Service;

    const confirm = () => {
        if (!slot) return;
        startTransition(async () => {
            const result = await rescheduleClientBookingAction(access, booking.id, slot.startsAt);
            if (result.ok) return onRescheduled(result.booking);
            if (result.expired) return onExpired();
            setNotice(result.message);
            if (result.slotTaken) setSlot(null);
        });
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Reagendar turno" className="fixed inset-0 z-50 overflow-y-auto bg-background">
            <div className="flex items-center justify-between px-4 py-4 sm:px-8 lg:px-16">
                <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Volver" className="rounded-full">
                    <ArrowLeft className="size-5" />
                </Button>
                <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Cerrar" className="rounded-full">
                    <X className="size-5" />
                </Button>
            </div>

            <div className="mx-auto w-full max-w-[720px] px-4 pb-24 sm:px-8">
                <h1 className="mb-6 text-[34px] leading-none font-extrabold tracking-[-0.03em] sm:text-[44px]">
                    Elegí día y horario
                </h1>

                <TimeStep service={service} date={date} slot={slot} notice={notice} onSelect={(d, s) => (setDate(d), setSlot(s))} />

                <Button
                    onClick={confirm}
                    disabled={!slot || pending}
                    className="mt-8 h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                >
                    {pending ? 'Reagendando…' : 'Reagendar turno'}
                </Button>
            </div>
        </div>
    );
}
