'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/react/shallow';
import { useCalendarStore } from '../../state/store';
import { BlockedTimeCell } from './BlockedTimeCell';

function roundX(x: number, roundBy: number) {
    return Math.round(x / roundBy) * roundBy;
}

type BlockedDayProps = {
    startHour: number;
    endHour: number;
    day: dayjs.Dayjs;
    now: dayjs.Dayjs;
};

/** Se suma 1 a `endHour` para cubrir también la última hora, la que dibuja la última línea. */
function BlockedBeforeToday({ day, startHour, endHour, now }: BlockedDayProps) {
    if (!day.isBefore(now, 'day')) return null;
    return (
        <div
            className="absolute w-full"
            style={{
                top: 'var(--one-minute-height)',
                zIndex: 60,
                height: `calc(${(endHour + 1 - startHour) * 60} * var(--one-minute-height))`,
            }}
        >
            <BlockedTimeCell />
        </div>
    );
}

/** Lo que ya pasó de hoy, redondeado a la celda; se restan 2px del borde. */
function BlockedToday({ day, startHour, gridCellsPerHour, endHour, now }: BlockedDayProps & { gridCellsPerHour: number }) {
    const dayStart = useMemo(() => day.startOf('day').hour(startHour), [day, startHour]);
    const dayEndInMinutes = useMemo(() => day.startOf('day').hour(endHour).diff(dayStart, 'minutes'), [day, endHour, dayStart]);
    const nowComparedToDayStart = Math.min(now.diff(dayStart, 'minutes'), dayEndInMinutes);

    if (!day.isSame(now, 'day')) return null;
    return (
        <div
            className="absolute w-full"
            style={{
                top: 'var(--one-minute-height)',
                zIndex: 60,
                height: `calc(${roundX(nowComparedToDayStart, 60 / gridCellsPerHour)} * var(--one-minute-height) - 2px)`,
            }}
        >
            <BlockedTimeCell />
        </div>
    );
}

/** Lo bloqueado de un día: los días pasados, lo que ya pasó de hoy y los `blockingDates` que todavía no terminaron. */
export function BlockedList({ day }: { day: dayjs.Dayjs }) {
    const { startHour, blockingDates, endHour, gridCellsPerHour, timezone } = useCalendarStore(
        useShallow((state) => ({
            startHour: state.startHour || 0,
            endHour: state.endHour || 23,
            blockingDates: state.blockingDates,
            gridCellsPerHour: state.gridCellsPerHour || 4,
            timezone: state.timezone,
        })),
    );
    const now = dayjs().tz(timezone);

    return (
        <>
            <BlockedBeforeToday day={day} startHour={startHour} endHour={endHour} now={now} />
            <BlockedToday gridCellsPerHour={gridCellsPerHour} day={day} startHour={startHour} endHour={endHour} now={now} />
            {blockingDates?.map((event, i) => {
                const dayStart = day.startOf('day').hour(startHour);
                const blockingStart = dayjs(event.start).tz(timezone);
                const eventEnd = dayjs(event.end).tz(timezone);
                const eventStart = dayStart.isAfter(blockingStart) ? dayStart : blockingStart;

                if (!eventStart.isSame(day, 'day')) return null;
                if (eventStart.isBefore(now) && eventEnd.isBefore(now)) return null;

                const eventDuration = eventEnd.diff(eventStart, 'minutes');
                const eventStartDiff = (eventStart.hour() - startHour) * 60;

                return (
                    <div
                        key={`${eventStart.toISOString()}-${i}`}
                        className="absolute w-full"
                        style={{
                            zIndex: 60,
                            top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                            height: `calc(${eventDuration}*var(--one-minute-height))`,
                        }}
                    >
                        <BlockedTimeCell />
                    </div>
                );
            })}
        </>
    );
}
