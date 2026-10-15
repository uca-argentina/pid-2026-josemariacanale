'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarX2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { cn } from '@/app/_components/utils';
import { listSeriesSlotsAction } from './actions';
import { formatDate } from './format';
import { seriesDatesView, skippedDates, type SeriesDate } from './series';

const MIN_SERIES = 2;

/**
 * El paso Fechas de una Serie (ADR 0032): pide las fechas desde el horario elegido y las lista todas, marcando las que
 * chocan. Con choques, el Cliente sigue sin esas fechas o vuelve a elegir otro horario: nunca se saltea una fecha sin
 * mostrarla. `conflicts` son las fechas del 409 al Reservar, que también se marcan.
 */
export function DatesStep({
    serviceId,
    startsAt,
    time,
    count,
    employeeId,
    conflicts,
    pending,
    onReady,
    onSkip,
    onChooseAnotherTime,
}: {
    serviceId: number;
    startsAt: string;
    /** La hora local del horario elegido, la misma en todas las fechas. */
    time: string;
    count: number;
    employeeId?: number;
    conflicts: string[];
    /** Mientras se reintenta Reservar sin las fechas que chocan. */
    pending: boolean;
    /** Avisa si todas las fechas están libres: entonces se avanza con el botón de siempre. */
    onReady: (allAvailable: boolean) => void;
    onSkip: (skipDates: string[]) => void;
    onChooseAnotherTime: (message?: string) => void;
}) {
    const [loaded, setLoaded] = useState<{ dates: SeriesDate[] } | { error: string } | null>(null);
    const callbacks = useRef({ onReady, onChooseAnotherTime });
    useEffect(() => {
        callbacks.current = { onReady, onChooseAnotherTime };
    });

    useEffect(() => {
        let current = true;
        listSeriesSlotsAction({ serviceId, startsAt, count, employeeId }).then(
            (result) => {
                if (!current) return;
                if (result.ok) return setLoaded({ dates: result.dates });
                if (result.slotTaken) return callbacks.current.onChooseAnotherTime(result.message);
                setLoaded({ error: result.message });
            },
            () => current && setLoaded({ error: 'No pudimos cargar las fechas de la Serie. Intentá de nuevo.' }),
        );
        return () => {
            current = false;
        };
    }, [serviceId, startsAt, count, employeeId]);

    const view = loaded && 'dates' in loaded ? seriesDatesView(loaded.dates, conflicts) : null;
    const { skip, remaining } = view ? skippedDates(view) : { skip: [], remaining: 0 };
    const allAvailable = view !== null && skip.length === 0;

    useEffect(() => {
        callbacks.current.onReady(allAvailable);
    }, [allAvailable]);

    if (loaded === null)
        return (
            <p className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando las fechas de la Serie…
            </p>
        );
    if ('error' in loaded)
        return (
            <p role="alert" className="text-[14px] font-semibold">
                {loaded.error}
            </p>
        );

    return (
        <div className="flex max-w-[560px] flex-col gap-5">
            {skip.length > 0 && (
                <p role="status" className="rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                    {skip.length === 1 ? 'Una fecha ya no está disponible.' : `${skip.length} fechas ya no están disponibles.`} Podés seguir
                    sin {skip.length === 1 ? 'ella' : 'ellas'} o elegir otro horario.
                </p>
            )}
            <ol className="flex flex-col gap-2">
                {view!.map((d) => (
                    <li
                        key={d.date}
                        className={cn(
                            'flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-[14px]',
                            d.available ? 'border-border' : 'border-dashed border-border text-muted-foreground',
                        )}
                    >
                        <span className={cn('font-bold first-letter:uppercase', !d.available && 'line-through')}>
                            {formatDate(d.date)} · {time}
                        </span>
                        {d.available ? (
                            <Check className="size-4 shrink-0" aria-label="Disponible" />
                        ) : (
                            <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold">
                                <CalendarX2 className="size-4" />
                                No disponible
                            </span>
                        )}
                    </li>
                ))}
            </ol>
            {skip.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => onSkip(skip)}
                        disabled={remaining < MIN_SERIES || pending}
                        className="h-auto rounded-xl bg-foreground px-5 py-3 font-bold text-white hover:bg-foreground/90"
                    >
                        {pending ? 'Reservando…' : 'Seguir sin esas fechas'}
                    </Button>
                    <Button variant="outline" onClick={() => onChooseAnotherTime()} disabled={pending} className="h-auto rounded-xl px-5 py-3 font-bold">
                        Elegir otro horario
                    </Button>
                </div>
            )}
            {skip.length > 0 && remaining < MIN_SERIES && (
                <p className="text-[13px] text-muted-foreground">Sin esas fechas quedan menos de 2 Turnos: elegí otro horario.</p>
            )}
        </div>
    );
}
