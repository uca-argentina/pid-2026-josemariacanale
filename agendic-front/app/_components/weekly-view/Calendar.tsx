'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/app/_components/utils';
import { Spinner } from '@/app/_components/ui/spinner';
import { BlockedList } from './components/blocking/BlockedList';
import { CurrentTime } from './components/CurrentTime';
import { DateValues } from './components/DateValues';
import { AvailableCellsForDay, EmptyCell } from './components/event/Empty';
import { EventList } from './components/event/EventList';
import { SchedulerHeading } from './components/heading/SchedulerHeading';
import { HorizontalLines } from './components/HorizontalLines';
import { SchedulerColumns } from './components/SchedulerColumns';
import { VerticalLines } from './components/VerticalLines';
import { CalendarStoreContext, createCalendarStore, useCalendarStore } from './state/store';
import type { CalendarComponentProps } from './types/state';
import { getDaysBetweenDates, getHoursToDisplay } from './utils';
import './styles.css';

const HOUR_SIZE = 58;

function CalendarInner(props: CalendarComponentProps) {
    const containerNav = useRef<HTMLDivElement | null>(null);

    const startDate = useCalendarStore((state) => state.startDate);
    const endDate = useCalendarStore((state) => state.endDate);
    const startHour = useCalendarStore((state) => state.startHour || 0);
    const endHour = useCalendarStore((state) => state.endHour || 23);
    const usersCellsStopsPerHour = useCalendarStore((state) => state.gridCellsPerHour || 4);
    const availableTimeslots = useCalendarStore((state) => state.availableTimeslots);
    const hideHeader = useCalendarStore((state) => state.hideHeader);
    const timezone = useCalendarStore((state) => state.timezone);
    const showBackgroundPattern = useCalendarStore((state) => state.showBackgroundPattern);
    const showBorder = useCalendarStore((state) => state.showBorder ?? true);
    const borderColor = useCalendarStore((state) => state.borderColor ?? 'default');
    const scrollToCurrentTime = useCalendarStore((state) => state.scrollToCurrentTime ?? true);
    const updateCurrentTimeOnFocus = useCalendarStore((state) => state.updateCurrentTimeOnFocus ?? false);

    const days = useMemo(() => getDaysBetweenDates(startDate, endDate, timezone), [startDate, endDate, timezone]);
    const hours = useMemo(() => getHoursToDisplay(startHour, endHour, timezone), [startHour, endHour, timezone]);
    const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;

    return (
        <MobileNotSupported>
            <div
                className="scheduler-wrapper flex h-full w-full flex-col"
                style={{ '--one-minute-height': `calc(${HOUR_SIZE}px/60)`, '--gridDefaultSize': `${HOUR_SIZE}px` } as React.CSSProperties}
            >
                {hideHeader !== true && <SchedulerHeading />}
                {props.isPending && (
                    <Spinner className="fixed top-1/2 left-1/2 z-80 size-10 -translate-x-1/2 -translate-y-1/2" />
                )}
                <div className="relative isolate flex h-full flex-auto flex-col bg-background">
                    <div style={{ width: '165%' }} className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
                        <DateValues containerNavRef={containerNav} days={days} showBorder={showBorder} borderColor={borderColor} />
                        <div className="relative flex flex-auto">
                            <CurrentTime
                                timezone={timezone}
                                scrollToCurrentTime={scrollToCurrentTime}
                                updateOnFocus={updateCurrentTimeOnFocus}
                            />
                            <div
                                className={cn(
                                    'sticky left-0 z-10 w-16 flex-none bg-background ring-1 ring-muted',
                                    showBorder && cn('border-r border-l', borderColor === 'subtle' ? 'border-border/60' : 'border-border'),
                                )}
                            />
                            <div
                                className="grid flex-auto grid-cols-1 grid-rows-1 [--disabled-gradient-background:#F8F9FB] [--disabled-gradient-foreground:#E6E7EB]"
                                style={
                                    showBackgroundPattern === false
                                        ? undefined
                                        : {
                                              backgroundColor: 'var(--disabled-gradient-background)',
                                              background:
                                                  'repeating-linear-gradient(-45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 5px)',
                                          }
                                }
                            >
                                <HorizontalLines
                                    hours={hours}
                                    borderColor={borderColor}
                                />
                                <VerticalLines days={days} borderColor={borderColor} />

                                <SchedulerColumns gridStopsPerDay={numberOfGridStopsPerDay}>
                                    {days.map((day, i) => (
                                        <li key={day.toISOString()} className="relative" style={{ gridColumnStart: i + 1 }}>
                                            <EventList day={day} />
                                            {props.blockingDates && <BlockedList day={day} />}
                                        </li>
                                    ))}
                                </SchedulerColumns>

                                <SchedulerColumns gridStopsPerDay={numberOfGridStopsPerDay}>
                                    {days.map((day, i) => (
                                        <li
                                            className="relative"
                                            key={i}
                                            style={{ gridColumnStart: i + 1, gridRow: `1 / span ${numberOfGridStopsPerDay}` }}
                                        >
                                            {availableTimeslots ? (
                                                <AvailableCellsForDay
                                                    key={day.toISOString()}
                                                    timezone={timezone}
                                                    day={day}
                                                    startHour={startHour}
                                                    availableSlots={availableTimeslots}
                                                />
                                            ) : (
                                                [...Array(numberOfGridStopsPerDay)].map((_, j) => (
                                                    <EmptyCell
                                                        key={`${i}-${j}`}
                                                        day={day}
                                                        gridCellIdx={j}
                                                        totalGridCells={numberOfGridStopsPerDay}
                                                        selectionLength={endHour - startHour}
                                                        startHour={startHour}
                                                        timezone={timezone}
                                                    />
                                                ))
                                            )}
                                        </li>
                                    ))}
                                </SchedulerColumns>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MobileNotSupported>
    );
}

/**
 * Grilla semanal copiada de cal.diy: una columna por día y una fila por hora, con capas apiladas (líneas,
 * eventos en cascada, bloqueos y celdas vacías clickeables o Horarios reservables). Lo bloqueado (días pasados,
 * lo que ya pasó de hoy y `blockingDates`) se pinta solo si se pasan `blockingDates`.
 *
 * Cada instancia tiene su propio store de zustand, que se vuelve a cargar desde las props cuando cambian. El store
 * nace con las props porque zustand renderiza en el server (y al hidratar) con el estado inicial, no con `initState`.
 */
export function Calendar(props: CalendarComponentProps) {
    const [store] = useState(() => {
        const created = createCalendarStore(props);
        created.getState().initState(props);
        return created;
    });

    useEffect(() => {
        store.getState().initState(props);
    }, [store, props]);

    return (
        <CalendarStoreContext.Provider value={store}>
            <CalendarInner {...props} />
        </CalendarStoreContext.Provider>
    );
}

const MobileNotSupported = ({ children }: { children: React.ReactNode }) => (
    <>
        <div className="flex h-full flex-col items-center justify-center sm:hidden">
            <h1 className="text-2xl font-bold">La vista calendario no está disponible en el celular</h1>
            <p className="text-muted-foreground">Abrila desde una computadora.</p>
        </div>
        <div className="hidden h-full sm:block">{children}</div>
    </>
);
