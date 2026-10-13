'use client';

import { es } from '@daypicker/react/locale';
import { CalendarRange, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import { fromCalendarRange, toCalendarRange, toLocalDay } from '@/app/_components/day-range';
import type { Preferences } from '@/src/entities/models/user';
import type { DayRange } from '@/app/_components/day-range';

/**
 * El filtro de rango de fechas de los Turnos: un botón que abre el Calendar y, con rango, "Limpiar". Elegir un
 * solo día filtra ese día.
 */
export function BookingDateRange({
    range,
    weekStart,
    onChange,
}: {
    range: DayRange | null;
    weekStart: Preferences['weekStart'];
    onChange: (range: DayRange | null) => void;
}) {
    const selected = range ? toCalendarRange({ startDate: range.from, endDate: range.to }) : undefined;

    return (
        <div className="flex items-center gap-1">
            <Popover>
                <PopoverTrigger render={<Button type="button" variant="outline" />}>
                    <CalendarRange />
                    {range ? `${formatOutOfOfficeDate(range.from)} – ${formatOutOfOfficeDate(range.to)}` : 'Rango de fechas'}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto">
                    <Calendar
                        mode="range"
                        locale={es}
                        weekStartsOn={weekStart}
                        defaultMonth={range ? toLocalDay(range.to) : undefined}
                        selected={selected}
                        onSelect={(next) => {
                            const picked = fromCalendarRange(next);
                            onChange(picked && { from: picked.startDate, to: picked.endDate });
                        }}
                    />
                </PopoverContent>
            </Popover>
            {range && (
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar rango de fechas" onClick={() => onChange(null)}>
                    <X />
                </Button>
            )}
        </div>
    );
}
