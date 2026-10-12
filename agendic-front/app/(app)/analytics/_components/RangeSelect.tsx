'use client';

import { useState } from 'react';
import { es } from '@daypicker/react/locale';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { fromCalendarRange, toCalendarRange } from '@/app/_components/day-range';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import type { Preferences } from '@/src/entities/models/user';
import { RANGE_PRESETS, type ActiveRange, type RangeChange, type RangePreset } from './analytics-range';

const CUSTOM = 'custom';

/**
 * El selector de rango de Analíticas: los presets en un Select y "Rango personalizado" con un Popover y un
 * Calendar de dos fechas. El rango lo tiene quien lo usa; acá solo se cambia por `onChange`.
 */
export function RangeSelect({
    range,
    weekStart,
    onChange,
}: {
    range: ActiveRange;
    weekStart: Preferences['weekStart'];
    onChange: (change: RangeChange) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center gap-2">
            <Select
                value={range.preset}
                onValueChange={(value) => {
                    if (value === CUSTOM) setOpen(true);
                    else if (value) onChange({ preset: value as RangePreset });
                }}
            >
                <SelectTrigger className="w-48" aria-label="Rango de fechas">
                    <SelectValue>
                        {(value: string) =>
                            value === CUSTOM ? `${formatOutOfOfficeDate(range.from)} – ${formatOutOfOfficeDate(range.to)}` : RANGE_PRESETS[value as RangePreset]
                        }
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(RANGE_PRESETS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM}>Rango personalizado</SelectItem>
                </SelectContent>
            </Select>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Elegir fechas" />}>
                    <CalendarDays />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto max-w-(--available-width)">
                    <Calendar
                        mode="range"
                        locale={es}
                        weekStartsOn={weekStart}
                        numberOfMonths={2}
                        defaultMonth={toCalendarRange({ startDate: range.from, endDate: range.to }).from}
                        selected={toCalendarRange({ startDate: range.from, endDate: range.to })}
                        onSelect={(selected, clicked) => {
                            // Desde un preset, el primer clic arranca un rango nuevo en vez de mover un extremo del preset.
                            const picked = fromCalendarRange(range.preset === CUSTOM ? selected : { from: clicked });
                            if (picked) onChange({ preset: CUSTOM, from: picked.startDate, to: picked.endDate });
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
