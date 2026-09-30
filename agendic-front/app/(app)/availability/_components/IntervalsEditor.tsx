'use client';

import { Plus, X } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { PanelIconButton, PanelSelect } from '@/app/(app)/_components/panel-ui';
import { TIME_OPTIONS, invalidIntervals, nextInterval, type AvailabilityInterval } from '@/app/(app)/_components/availability-week';

const TIMES = TIME_OPTIONS.map((t) => ({ value: t, label: t }));

function TimeSelect({
    label,
    value,
    invalid,
    onChange,
}: {
    label: string;
    value: string;
    invalid: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <PanelSelect
            aria-label={label}
            value={value}
            onValueChange={onChange}
            options={TIMES}
            className={cn('w-[104px]', invalid && 'border-[#b91c1c] hover:border-[#b91c1c]')}
        />
    );
}

/** Las Franjas de un día, cada una con su X. Las que terminan antes de empezar o se pisan quedan en rojo. */
export function IntervalsEditor({
    intervals,
    onChange,
}: {
    intervals: AvailabilityInterval[];
    onChange: (intervals: AvailabilityInterval[]) => void;
}) {
    const invalid = invalidIntervals(intervals);
    const update = (i: number, interval: AvailabilityInterval) => onChange(intervals.map((current, j) => (j === i ? interval : current)));

    return (
        <div className="flex flex-col gap-2">
            {intervals.map(([from, to], i) => (
                <div key={i} className="flex items-center gap-2">
                    <TimeSelect label="Desde" value={from} invalid={invalid.includes(i)} onChange={(v) => update(i, [v, to])} />
                    <span className="text-[13px] font-bold text-[#374151]">-</span>
                    <TimeSelect label="Hasta" value={to} invalid={invalid.includes(i)} onChange={(v) => update(i, [from, v])} />
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
    intervals: AvailabilityInterval[];
    onChange: (intervals: AvailabilityInterval[]) => void;
}) {
    const next = nextInterval(intervals);
    return (
        <PanelIconButton bordered label="Agregar Franja" disabled={!next} onClick={() => next && onChange([...intervals, next])}>
            <Plus />
        </PanelIconButton>
    );
}
