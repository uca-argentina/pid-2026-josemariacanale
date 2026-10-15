'use client';

import { Switch } from '@/app/_components/ui/switch';
import { cn } from '@/app/_components/utils';
import { countOptions, everyWeeksLabel, SERIES_MIN_BOOKINGS } from './series';

/**
 * "Repetir cada N semanas" del paso Horario, en un Servicio con Repetición (ADR 0007): prendido, el Cliente elige
 * cuántos Turnos tiene la Serie, de 2 al máximo del Servicio. `count` `null` es un Turno suelto.
 */
export function RepeatControl({
    everyWeeks,
    maxBookings,
    count,
    onChange,
}: {
    everyWeeks: number;
    maxBookings: number;
    count: number | null;
    onChange: (count: number | null) => void;
}) {
    const every = everyWeeksLabel(everyWeeks);

    return (
        <section aria-label="Repetir el turno" className="mt-8 flex max-w-[560px] flex-col gap-4 rounded-2xl border border-border p-4.5">
            <label className="flex items-center justify-between gap-4">
                <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold tracking-[-0.02em]">Repetir {every}</span>
                    <span className="text-[13px] text-muted-foreground">Reservá una Serie: el mismo horario, {every}.</span>
                </span>
                <Switch checked={count !== null} onCheckedChange={(on) => onChange(on ? SERIES_MIN_BOOKINGS : null)} aria-label={`Repetir ${every}`} />
            </label>
            {count !== null && (
                <div className="flex flex-col gap-2">
                    <span id="repeat-count-label" className="text-[13.5px] font-bold">
                        Cantidad de turnos
                    </span>
                    <div role="radiogroup" aria-labelledby="repeat-count-label" className="flex flex-wrap gap-2">
                        {countOptions(maxBookings).map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={count === n}
                                onClick={() => onChange(n)}
                                className={cn(
                                    'min-w-11 rounded-full border px-4 py-2 text-[13.5px] font-bold transition-colors',
                                    count === n ? 'border-foreground bg-foreground text-white' : 'border-border hover:border-foreground/40',
                                )}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
