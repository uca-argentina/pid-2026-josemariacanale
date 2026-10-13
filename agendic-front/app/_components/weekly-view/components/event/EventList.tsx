'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/app/_components/utils';
import { useCalendarStore } from '../../state/store';
import { calculateEventLayouts, createLayoutMap } from '../../utils/overlap';
import { Event } from './Event';

const MINUTES_IN_DAY = 24 * 60;

/**
 * Los eventos de un día, posicionados por hora y en cascada según su solapamiento.
 *
 * El que está bajo el cursor (o el elegido) pasa al frente y el resto de su grupo se atenúa; al cambiar el
 * elegido, scrollea hasta él. Las horas se leen en la zona de la grilla.
 */
export function EventList({ day }: { day: dayjs.Dayjs }) {
    const { startHour, events, eventOnClick, selectedBookingUid, timezone, eventsDisabled } = useCalendarStore(
        useShallow((state) => ({
            startHour: state.startHour,
            events: state.events,
            eventOnClick: state.onEventClick,
            selectedBookingUid: state.selectedBookingUid,
            timezone: state.timezone,
            eventsDisabled: state.eventsDisabled,
        })),
    );

    const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);

    const dayEvents = useMemo(
        () => events.filter((event) => dayjs(event.start).tz(timezone).isSame(day, 'day') && !event.options?.allDay),
        [events, day, timezone],
    );

    const layoutMap = useMemo(() => createLayoutMap(calculateEventLayouts(dayEvents)), [dayEvents]);

    const eventCalculations = useMemo(
        () =>
            new Map(
                dayEvents.map((event) => {
                    const eventStart = dayjs(event.start).tz(timezone);
                    const eventStartDiff = (eventStart.hour() - (startHour || 0)) * 60 + eventStart.minute();
                    const eventDuration = Math.min(
                        dayjs(event.end).diff(eventStart, 'minutes'),
                        MINUTES_IN_DAY - eventStartDiff,
                    );
                    return [event.id, { eventStart, eventDuration, eventStartDiff }];
                }),
            ),
        [dayEvents, startHour, timezone],
    );

    const hoveredEventLayout = hoveredEventId ? layoutMap.get(hoveredEventId) : null;
    const hoveredGroupIndex = hoveredEventLayout?.groupIndex ?? null;

    const selectedEventId = useMemo(() => {
        if (!selectedBookingUid) return undefined;
        return dayEvents.find((event) => event.options?.bookingUid === selectedBookingUid)?.id;
    }, [dayEvents, selectedBookingUid]);

    useEffect(() => {
        if (selectedEventId === undefined) return;
        requestAnimationFrame(() => {
            document
                .querySelector(`[data-calendar-event-id="${selectedEventId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }, [selectedEventId]);

    return (
        <>
            {dayEvents.map((event) => {
                const layout = layoutMap.get(event.id);
                const calc = eventCalculations.get(event.id);
                if (!layout || !calc) return null;

                const { eventStart, eventDuration, eventStartDiff } = calc;
                const isHovered = hoveredEventId === event.id;
                const isSelected = selectedEventId === event.id;
                const isInHoveredGroup = hoveredGroupIndex !== null && layout.groupIndex === hoveredGroupIndex;
                const zIndex = isHovered || isSelected ? 79 : layout.baseZIndex;

                return (
                    <div
                        key={`${event.id}-${eventStart.toISOString()}`}
                        className={cn('absolute transition-all duration-100 ease-out', event.options?.borderOnly && 'pointer-events-none')}
                        data-testid={event.options?.['data-test-id']}
                        data-calendar-event-id={event.id}
                        data-calendar-event-source={event.source}
                        onMouseEnter={() => setHoveredEventId(event.id)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        style={{
                            left: `${layout.leftOffsetPercent}%`,
                            width: `${layout.widthPercent}%`,
                            zIndex,
                            top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                            height: `max(15px, calc(${eventDuration}*var(--one-minute-height)))`,
                            transform: isHovered || isSelected ? 'scale(1.02)' : 'scale(1)',
                            opacity: hoveredGroupIndex !== null && !isHovered && isInHoveredGroup ? 0.6 : 1,
                        }}
                    >
                        <Event
                            event={event}
                            eventDuration={eventDuration}
                            onEventClick={eventOnClick}
                            disabled={eventsDisabled}
                            isHovered={isHovered}
                            currentlySelectedEventId={selectedEventId}
                        />
                    </div>
                );
            })}
        </>
    );
}
