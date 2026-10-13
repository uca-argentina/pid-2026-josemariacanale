import type React from 'react';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/app/_components/utils';
import { useCalendarStore } from '../state/store';
import type { BorderColor } from '../types/common';

type Props = {
    showBorder: boolean;
    borderColor: BorderColor;
    days: dayjs.Dayjs[];
    containerNavRef: React.RefObject<HTMLDivElement | null>;
};

const formatDate = (date: dayjs.Dayjs) =>
    new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(Date.UTC(date.year(), date.month(), date.date())))
        .replace('.', '');

/** La zona como `GMT -3` (en horas decimales, `GMT +5.5`), o `GMT` si es cero; si falla, el nombre de la ciudad. */
function timezoneDisplay(timezone: string) {
    try {
        const utcOffsetInMinutes = dayjs().tz(timezone).utcOffset();
        if (utcOffsetInMinutes === 0) return 'GMT';
        const sign = utcOffsetInMinutes < 0 ? '-' : '+';
        return `GMT ${sign}${Math.abs(utcOffsetInMinutes / 60)}`;
    } catch {
        return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    }
}

/** El encabezado sticky con los días ("LUN 12") y el de hoy resaltado; en celular, una fila compacta. Hoy y la zona se calculan en un effect, en la zona de la grilla, para que el server no pinte otro día al hidratar. */
export function DateValues({ showBorder, borderColor, days, containerNavRef }: Props) {
    const timezone = useCalendarStore((state) => state.timezone);
    const showTimezone = useCalendarStore((state) => state.showTimezone ?? false);
    const [now, setNow] = useState<{ today: string; zone: string } | null>(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() =>
            setNow({ today: dayjs().tz(timezone).format('YYYY-MM-DD'), zone: timezoneDisplay(timezone) }),
        );
        return () => cancelAnimationFrame(frame);
    }, [timezone]);
    const today = now?.today;
    const isToday = (day: dayjs.Dayjs) => day.format('YYYY-MM-DD') === today;
    const border = borderColor === 'subtle' ? 'border-border/60' : 'border-border';

    return (
        <div
            ref={containerNavRef}
            className={cn(
                'sticky top-(--calendar-dates-sticky-offset,0px) z-80 flex-none border-b bg-background',
                border,
                showBorder && 'border-r',
            )}
        >
            <div className="flex leading-6 text-muted-foreground sm:hidden" data-dayslength={days.length}>
                {days.map((day) => (
                    <button key={day.toString()} type="button" className="flex flex-1 flex-col items-center pt-2 pb-3">
                        {formatDate(day).slice(0, 2)}{' '}
                        <span
                            className={cn(
                                'mt-1 flex h-8 w-8 items-center justify-center font-medium text-foreground',
                                isToday(day) && 'rounded-sm bg-primary text-primary-foreground',
                            )}
                        >
                            {day.format('D')}
                        </span>
                    </button>
                ))}
            </div>
            <div className="-mr-px hidden auto-cols-fr leading-6 text-muted-foreground sm:flex">
                <div className={cn('col-end-1 flex w-16 items-center justify-center', showBorder && cn('border-l', border))}>
                    {showTimezone && timezone && (
                        <span className="text-xs font-medium text-muted-foreground">{now?.zone}</span>
                    )}
                </div>
                {days.map((day) => (
                    <div
                        key={day.toString()}
                        className={cn(
                            'flex flex-1 items-center justify-center py-3 text-xs font-medium uppercase',
                            isToday(day) && 'text-foreground',
                        )}
                    >
                        <span>
                            {formatDate(day)}{' '}
                            <span
                                className={cn(
                                    'items-center justify-center p-1',
                                    isToday(day) && 'ml-1 rounded-md bg-primary text-primary-foreground',
                                )}
                            >
                                {day.format('DD')}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
