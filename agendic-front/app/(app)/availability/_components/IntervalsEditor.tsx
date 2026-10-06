'use client';

import { Plus, X } from 'lucide-react';
import { PanelIconButton } from '@/app/(app)/_components/panel-ui';
import { TimeSelect } from '@/app/(app)/_components/TimeSelect';
import { invalidIntervals, nextInterval } from '@/app/(app)/_components/availability-week';
import type { TimeRange } from '@/src/entities/models/availability';

/** Las Franjas de un día, cada una con su X. Las que terminan antes de empezar o se pisan quedan en rojo. */
export function IntervalsEditor({
    intervals,
    onChange,
}: {
    intervals: TimeRange[];
    onChange: (intervals: TimeRange[]) => void;
}) {
    const invalid = invalidIntervals(intervals);
    const update = (i: number, interval: TimeRange) => onChange(intervals.map((current, j) => (j === i ? interval : current)));

    return (
        <div className="flex flex-col gap-2">
            {intervals.map(({ start, end }, i) => (
                <div key={i} className="flex items-center gap-2">
                    <TimeSelect aria-label="Desde" className="w-[104px]" value={start} invalid={invalid.includes(i)} onChange={(v) => update(i, { start: v, end })} />
                    <span className="text-[13px] font-bold text-[#374151]">-</span>
                    <TimeSelect aria-label="Hasta" className="w-[104px]" value={end} invalid={invalid.includes(i)} onChange={(v) => update(i, { start, end: v })} />
                    <PanelIconButton
                        label="Quitar Franja"
                        className="size-8 rounded-md"
                        onClick={() => onChange(intervals.filter((_, j) => j !== i))}
                    >
                        <X />
                    </PanelIconButton>
                </div>
            ))}
        </div>
    );
}

/** Suma la Franja siguiente (`nextInterval`); se deshabilita cuando el día ya no tiene lugar. */
export function AddIntervalButton({
    intervals,
    onChange,
}: {
    intervals: TimeRange[];
    onChange: (intervals: TimeRange[]) => void;
}) {
    const next = nextInterval(intervals);
    return (
        <PanelIconButton bordered label="Agregar Franja" disabled={!next} onClick={() => next && onChange([...intervals, next])}>
            <Plus />
        </PanelIconButton>
    );
}
