'use client';

import { es } from '@daypicker/react/locale';
import { Calendar } from '@/app/_components/ui/calendar';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import { fromCalendarRange, toCalendarRange, toLocalDay } from '@/app/_components/day-range';
import type { Preferences } from '@/src/entities/models/user';
import type { DayRange } from '@/app/_components/day-range';
import { addDays } from './calendar-week';

const presets = (today: string): { label: string; range: DayRange }[] => [
    { label: 'Hoy', range: { from: today, to: today } },
    { label: 'Próximos 7 días', range: { from: today, to: addDays(today, 6) } },
    { label: 'Últimos 7 días', range: { from: addDays(today, -6), to: today } },
];

/** El rango elegido, en texto: el nombre del atajo si coincide con uno, o las dos fechas. */
export function rangeSummary(range: DayRange, today: string) {
    const preset = presets(today).find((p) => p.range.from === range.from && p.range.to === range.to);
    return preset?.label ?? `${formatOutOfOfficeDate(range.from)} – ${formatOutOfOfficeDate(range.to)}`;
}

/** Rango de partida al agregar el filtro: los próximos 7 días. */
export const defaultRange = (today: string) => presets(today)[1].range;

/**
 * Contenido del popover del filtro "Rango de Fechas": atajos a la izquierda y el Calendar a la derecha. Elegir
 * un solo día filtra ese día.
 */
export function BookingDateRange({
    range,
    today,
    weekStart,
    onChange,
}: {
    range: DayRange;
    today: string;
    weekStart: Preferences['weekStart'];
    onChange: (range: DayRange) => void;
}) {
    return (
        <div className="flex">
            <ul className="m-0 flex list-none flex-col gap-0.5 border-r border-[#e5e7eb] p-2">
                {presets(today).map((p) => (
                    <li key={p.label}>
                        <button
                            type="button"
                            onClick={() => onChange(p.range)}
                            className="w-full rounded px-2.5 py-2 text-left text-[13px] font-semibold whitespace-nowrap text-[#0f1b2d] outline-none hover:bg-[#f3f4f6] focus-visible:bg-[#f3f4f6]"
                        >
                            {p.label}
                        </button>
                    </li>
                ))}
            </ul>
            <Calendar
                mode="range"
                locale={es}
                weekStartsOn={weekStart}
                defaultMonth={toLocalDay(range.to)}
                selected={toCalendarRange({ startDate: range.from, endDate: range.to })}
                onSelect={(next) => {
                    const picked = fromCalendarRange(next);
                    if (picked) onChange({ from: picked.startDate, to: picked.endDate });
                }}
            />
        </div>
    );
}
