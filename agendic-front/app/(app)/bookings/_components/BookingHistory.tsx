'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getBookingHistoryAction, type BookingHistoryResult } from '../actions';
import type { Preferences } from '@/src/entities/models/user';
import { HISTORY_LOAD_ERROR, type Booking } from './booking-helpers';

/** Lo que cambia el Historial del Turno: con otra clave, se pide de nuevo. */
const historyKey = (b: Booking) => [b.id, b.status, b.noShowAt, b.employeeNoShowAt, b.depositPaidAt, b.cancelledBy].join('|');

/**
 * El Historial del Turno como línea de tiempo, en el panel lateral: se pide al abrir el Turno y de nuevo cuando el Turno
 * cambia. Mientras carga muestra un indicador y, si la API falla, un mensaje, sin afectar el resto del panel.
 */
export function BookingHistory({ booking, timeFormat }: { booking: Booking; timeFormat: Preferences['timeFormat'] }) {
    const key = `${historyKey(booking)}|${timeFormat}`;
    const [loaded, setLoaded] = useState<{ key: string; result: BookingHistoryResult } | null>(null);

    useEffect(() => {
        let current = true;
        getBookingHistoryAction(booking.id, timeFormat).then(
            (result) => current && setLoaded({ key, result }),
            () => current && setLoaded({ key, result: { ok: false, message: HISTORY_LOAD_ERROR } }),
        );
        return () => {
            current = false;
        };
    }, [booking.id, key, timeFormat]);

    const result = loaded?.key === key ? loaded.result : null;

    return (
        <section aria-label="Historial del turno" aria-busy={result === null} className="flex flex-col gap-2">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">Historial</h3>
            {result === null ? (
                <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-[#6b7280]">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando historial…
                </p>
            ) : !result.ok ? (
                <p role="alert" className="m-0 text-[13px] font-medium text-[#b91c1c]">
                    {result.message}
                </p>
            ) : (
                <ol className="m-0 flex list-none flex-col gap-3 border-l border-[#e5e7eb] p-0 pl-4">
                    {result.entries.map((entry, index) => (
                        <li key={index} className="relative flex flex-col gap-0.5 text-[13.5px]">
                            <span aria-hidden className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-[#0f1b2d]" />
                            <span className="font-semibold text-[#0f1b2d]">
                                {entry.text} <span className="font-medium text-[#6b7280]">· {entry.at}</span>
                            </span>
                            {entry.reason && <span className="text-[#6b7280]">Motivo: {entry.reason}</span>}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
