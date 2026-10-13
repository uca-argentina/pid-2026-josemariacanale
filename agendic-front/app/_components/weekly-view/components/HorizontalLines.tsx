import { useId } from 'react';
import type dayjs from 'dayjs';
import { cn } from '@/app/_components/utils';
import { useCalendarStore } from '../state/store';
import type { BorderColor } from '../types/common';
import { formatTime } from '../utils';

/**
 * Las líneas de cada hora con su etiqueta a la izquierda, más la de la hora siguiente a la última.
 *
 * Se muestra solo la hora: en una zona como GMT+5:30 la etiqueta diría `:30` en la posición de la hora en punto.
 */
export const HorizontalLines = ({
    hours,
    borderColor,
}: {
    hours: dayjs.Dayjs[];
    borderColor: BorderColor;
}) => {
    const timeFormat = useCalendarStore((state) => state.timeFormat ?? 24);
    const label = (hour: dayjs.Dayjs) => formatTime(Date.UTC(1970, 0, 1, hour.hour()), 'UTC', timeFormat);
    const finalHour = label(hours[hours.length - 1].add(1, 'hour'));
    const id = useId();

    return (
        <div
            className={cn(
                'pointer-events-none relative z-60 col-start-1 col-end-2 row-start-1 grid divide-y',
                borderColor === 'subtle' ? 'divide-border/60' : 'divide-border',
            )}
            style={{ gridTemplateRows: `repeat(${hours.length}, minmax(var(--gridDefaultSize),1fr)` }}
        >
            <div className="row-end-1 h-(--calendar-offset-top)" />
            {hours.map((hour) => (
                <div key={`${id}-${hour.get('hour')}`}>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-muted-foreground rtl:-mr-14">
                        {label(hour)}
                    </div>
                </div>
            ))}
            <div key={`${id}-${finalHour}`}>
                <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-muted-foreground rtl:-mr-14">
                    {finalHour}
                </div>
            </div>
        </div>
    );
};
