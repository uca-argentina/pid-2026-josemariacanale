'use client';

import { useMemo, useState } from 'react';
import type { BookingStatus } from '@/src/entities/models/booking';
import { cn } from '@/app/_components/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/ui/tooltip';
import { formatTimeIn, minutesFromStart, type TimeFormat } from './grid-math';
import { calculateEventLayouts, createLayoutMap } from './overlap';
import type { CalendarEvent } from './types';

const STATUS_CLASSES: Record<BookingStatus, string> = {
    BOOKED: 'border-primary/40 bg-primary/10 text-foreground hover:bg-primary/20',
    PENDING: 'border-dashed border-primary/40 bg-muted text-foreground',
    REJECTED: 'border-dashed bg-muted text-muted-foreground line-through',
    CANCELLED: 'border-dashed bg-muted text-muted-foreground line-through',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
    BOOKED: 'Aceptado',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
};

const HOVER_Z_INDEX = 79;
const MINUTES_IN_DAY = 24 * 60;

interface EventListProps {
    events: CalendarEvent[];
    timeZone: string;
    timeFormat: TimeFormat;
    onEventClick: (id: number) => void;
}

/** Los eventos de un día posicionados por hora y en cascada según su solapamiento; el que está bajo el cursor pasa al frente. */
export function EventList({ events, timeZone, timeFormat, onEventClick }: EventListProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const layouts = useMemo(() => createLayoutMap(calculateEventLayouts(events)), [events]);

    return (
        <>
            {events.map((event) => {
                const layout = layouts.get(event.id);
                if (!layout) return null;
                const startMinutes = minutesFromStart(event.start, timeZone);
                const duration = Math.min(
                    Math.round((event.end.getTime() - new Date(event.start).getTime()) / 60000),
                    MINUTES_IN_DAY - startMinutes,
                );
                const status = event.options?.status;
                const range = `${formatTimeIn(event.start, timeZone, timeFormat)} – ${formatTimeIn(event.end, timeZone, timeFormat)}`;

                return (
                    <div
                        key={event.id}
                        className="absolute"
                        data-calendar-event-id={event.id}
                        onMouseEnter={() => setHoveredId(event.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                            left: `${layout.leftOffsetPercent}%`,
                            width: `${layout.widthPercent}%`,
                            zIndex: hoveredId === event.id ? HOVER_Z_INDEX : layout.baseZIndex,
                            top: `calc(${startMinutes} * var(--one-minute-height))`,
                            height: `max(15px, calc(${duration} * var(--one-minute-height)))`,
                        }}
                    >
                        <Tooltip>
                            <TooltipTrigger
                                render={<button type="button" />}
                                onClick={() => onEventClick(event.id)}
                                className={cn(
                                    'flex h-full w-full cursor-pointer overflow-hidden rounded-md border px-1.5 text-left text-xs font-medium leading-4 transition-colors',
                                    status ? STATUS_CLASSES[status] : STATUS_CLASSES.BOOKED,
                                    event.options?.className,
                                )}
                            >
                                <span className={cn('flex w-full gap-2 py-0.5', duration >= 40 ? 'flex-col' : 'items-center')}>
                                    <span className="truncate">{event.title}</span>
                                    {!event.options?.hideTime && (
                                        <span className="truncate text-[10px] text-muted-foreground">{range}</span>
                                    )}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold">{event.title}</span>
                                    {!event.options?.hideTime && <span>{range}</span>}
                                    {event.description && <span>{event.description}</span>}
                                    {status && status !== 'BOOKED' && <span>{STATUS_LABELS[status]}</span>}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                );
            })}
        </>
    );
}
