'use client';

import dayjs from 'dayjs';
import { cn } from '@/app/_components/utils';
import { CurrentTime } from './CurrentTime';
import { EventList } from './EventList';
import { dayKey, eventsOfDay, formatDayHeader, formatTimeIn, type TimeFormat } from './grid-math';
import type { CalendarEvent } from './types';

const HOUR_SIZE_PX = 58;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAYS_IN_WEEK = 7;

const hourLabel = (hour: number, timeFormat: TimeFormat) =>
    formatTimeIn(new Date(Date.UTC(1970, 0, 1, hour)), 'UTC', timeFormat);

interface WeeklyViewProps {
    /** Cualquier instante del primer día de la semana; el día se lee en `timeZone`. */
    weekStart: Date;
    events: CalendarEvent[];
    timeZone: string;
    timeFormat: TimeFormat;
    /** El instante actual: lo pasa quien la usa para que servidor e hidratación pinten lo mismo. */
    now: number;
    onEventClick: (id: number) => void;
}

/** Grilla semanal: una columna por día y una fila por hora, con los eventos en cascada. Solo los eventos son clickeables. */
export function WeeklyView({ weekStart, events, timeZone, timeFormat, now, onEventClick }: WeeklyViewProps) {
    const firstDay = dayjs.tz(dayKey(weekStart, timeZone), timeZone);
    const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
        const day = firstDay.add(i, 'day');
        return { key: day.format('YYYY-MM-DD'), header: formatDayHeader(day.toDate(), timeZone) };
    });
    const todayKey = dayKey(now, timeZone);

    return (
        <div
            className="relative isolate flex w-full flex-col bg-background"
            style={{ '--one-minute-height': `calc(${HOUR_SIZE_PX}px / 60)` } as React.CSSProperties}
        >
            <div className="sticky top-0 z-[80] flex border-b border-border bg-background">
                <div className="w-14 flex-none" />
                {days.map(({ key, header }) => (
                    <div
                        key={key}
                        className="flex flex-1 items-center justify-center gap-1 py-3 text-xs font-medium text-muted-foreground"
                    >
                        <span>{header.weekday}</span>
                        <span className={cn('rounded-md p-1', key === todayKey && 'bg-primary text-primary-foreground')}>
                            {header.day}
                        </span>
                    </div>
                ))}
            </div>
            <div className="relative" style={{ height: `${HOURS.length * HOUR_SIZE_PX}px` }}>
                <div className="pointer-events-none absolute inset-0 z-[60]">
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className={cn('relative', hour > 0 && 'border-t border-border')}
                            style={{ height: `${HOUR_SIZE_PX}px` }}
                        >
                            {hour > 0 && (
                                <span className="absolute -top-2.5 w-14 pr-2 text-right text-xs leading-5 text-muted-foreground">
                                    {hourLabel(hour, timeFormat)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-14 right-0 z-[60] grid grid-cols-7 divide-x divide-border border-l border-border">
                    {days.map(({ key }) => (
                        <div key={key} />
                    ))}
                </div>
                <div className="absolute inset-y-0 left-14 right-0 grid grid-cols-7">
                    {days.map(({ key }) => (
                        <div key={key} className="relative">
                            <EventList
                                events={eventsOfDay(events, key, timeZone)}
                                timeZone={timeZone}
                                timeFormat={timeFormat}
                                onEventClick={onEventClick}
                            />
                        </div>
                    ))}
                </div>
                {days.some(({ key }) => key === todayKey) && (
                    <CurrentTime now={now} timeZone={timeZone} timeFormat={timeFormat} />
                )}
            </div>
        </div>
    );
}
