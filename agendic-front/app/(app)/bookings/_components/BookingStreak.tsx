'use client';

import { useEffect, useState, useTransition } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm } from '@/app/(app)/_components/panel-ui';
import { getBookingStreakAction, redeemPrizeAction, type BookingStreakResult } from '../actions';
import { STREAK_LOAD_ERROR, type Booking } from './booking-helpers';

/** Lo que cambia la Racha del Cliente de un Turno: con otra clave, se pide de nuevo. */
const streakKey = (b: Booking, reload: number) => [b.id, b.status, b.noShowAt, b.employeeNoShowAt, reload].join('|');

type Prize = NonNullable<Extract<BookingStreakResult, { ok: true }>['streak']>['prizes'][number];

/**
 * El bloque Racha del detalle del Turno: la Racha del Cliente y hasta cuándo dura, lo que le falta para la próxima
 * Recompensa y sus Premios disponibles, que el Empleado Canjea con una confirmación. Se pide al abrir el Turno y de nuevo
 * después de Canjear. No aparece si no hay Racha en curso ni Premios; el mensaje de un Canje que no se pudo (ya Canjeado,
 * vencido…) sí, y queda hasta el próximo Canje.
 */
export function BookingStreak({ booking }: { booking: Booking }) {
    const [reload, setReload] = useState(0);
    const key = streakKey(booking, reload);
    const [loaded, setLoaded] = useState<{ bookingId: number; key: string; result: BookingStreakResult } | null>(null);
    const [message, setMessage] = useState<{ bookingId: number; text: string } | null>(null);
    const [confirming, setConfirming] = useState<Prize | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let current = true;
        getBookingStreakAction(booking.id).then(
            (result) => current && setLoaded({ bookingId: booking.id, key, result }),
            () => current && setLoaded({ bookingId: booking.id, key, result: { ok: false, message: STREAK_LOAD_ERROR } }),
        );
        return () => {
            current = false;
        };
    }, [booking.id, key]);

    // The previous answer stays on screen while the next one loads, but never the one of another Turno.
    const result = loaded?.bookingId === booking.id ? loaded.result : null;
    const error = message?.bookingId === booking.id ? message.text : undefined;
    const data = result?.ok ? result.streak : null;
    if (!data && !error && !(result && !result.ok)) return null;

    const canRedeem = booking.status === 'BOOKED';
    const redeem = (prize: Prize) =>
        startTransition(async () => {
            const redeemed = await redeemPrizeAction(booking.id, prize.id);
            if (redeemed.ok) {
                setMessage(null);
                toast.success(`Canjeaste: ${redeemed.text}`);
            } else setMessage({ bookingId: booking.id, text: redeemed.message });
            setReload((n) => n + 1);
        });

    return (
        <section aria-label="Racha del Cliente" aria-busy={isPending} className="flex flex-col gap-2">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">Racha</h3>
            {result && !result.ok && (
                <p role="alert" className="m-0 text-[13px] font-medium text-[#b91c1c]">
                    {result.message}
                </p>
            )}
            {data?.streak && (
                <div className="flex flex-col gap-0.5 text-[13.5px] font-medium text-[#0f1b2d]">
                    <span className="flex items-center gap-1.5 font-semibold">
                        <Flame className="size-4 shrink-0 text-[#b45309]" />
                        {data.streak.title}
                    </span>
                    {data.streak.until && <span className="text-[#6b7280]">{data.streak.until}</span>}
                    {data.nextReward && <span className="text-[#6b7280]">{data.nextReward}</span>}
                </div>
            )}
            {data && data.prizes.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {data.prizes.map((prize) => (
                        <li key={prize.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-[#e5e7eb] px-3 py-2">
                            <span className="flex min-w-0 flex-col text-[13.5px]">
                                <span className="font-semibold break-words text-[#0f1b2d]">{prize.text}</span>
                                {prize.expires && <span className="text-[12.5px] font-medium text-[#6b7280]">{prize.expires}</span>}
                            </span>
                            {canRedeem && (
                                <PanelButton variant="secondary" disabled={isPending} onClick={() => setConfirming(prize)} className="h-8">
                                    {isPending && confirming?.id === prize.id ? <Loader2 className="size-4 animate-spin" /> : 'Canjear'}
                                </PanelButton>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {data && data.prizes.length > 0 && !canRedeem && (
                <p className="m-0 text-[12.5px] font-medium text-[#6b7280]">Los Premios se canjean en un turno aceptado.</p>
            )}
            {error && (
                <p role="alert" className="m-0 text-[13px] font-medium text-[#b91c1c]">
                    {error}
                </p>
            )}
            <PanelConfirm
                open={confirming !== null}
                onOpenChange={(open) => !open && setConfirming(null)}
                title={`¿Entregaste ${confirming?.text ?? 'el Premio'} en este Turno?`}
                description="Queda asentado como entregado y no se puede deshacer."
                confirmLabel="Canjear"
                onConfirm={() => confirming && redeem(confirming)}
            />
        </section>
    );
}
