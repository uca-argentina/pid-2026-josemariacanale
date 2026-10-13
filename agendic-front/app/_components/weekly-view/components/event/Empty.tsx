'use client';

import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/app/_components/utils';
import { useCalendarStore } from '../../state/store';
import type { CalendarAvailableTimeslots } from '../../types/state';
import { formatTime, gridCellToDateTime, type GridCellToDateProps } from '../../utils';
import { OutOfOfficeSlot } from '../OutOfOfficeSlot';

type EmptyCellProps = GridCellToDateProps & {
    isDisabled?: boolean;
    topOffsetMinutes?: number;
};

/** Una celda vacía de la grilla, clickeable, en la hora que le toca por su índice. */
export function EmptyCell(props: EmptyCellProps) {
    const cellToDate = gridCellToDateTime({
        day: props.day,
        gridCellIdx: props.gridCellIdx,
        totalGridCells: props.totalGridCells,
        selectionLength: props.selectionLength,
        startHour: props.startHour,
        timezone: props.timezone,
    });

    const minutesFromStart = (cellToDate.hour() - props.startHour) * 60 + cellToDate.minute();

    return <Cell topOffsetMinutes={minutesFromStart} timeSlot={dayjs(cellToDate).tz(props.timezone)} />;
}

type AvailableCellProps = {
    timezone: string;
    availableSlots: CalendarAvailableTimeslots;
    day: GridCellToDateProps['day'];
    startHour: GridCellToDateProps['startHour'];
};

/**
 * Las celdas de los Horarios reservables de un día.
 *
 * Si todos los del día son Fuera de la oficina, muestra una sola tarjeta de punta a punta; si además no hay
 * nota pública ni es un Día festivo, no muestra nada.
 */
export function AvailableCellsForDay({ timezone, availableSlots, day, startHour }: AvailableCellProps) {
    const dateFormatted = day.format('YYYY-MM-DD');
    const slotsForToday = availableSlots && availableSlots[dateFormatted];

    const slots = useMemo(() => {
        const calculatedSlots: { slot: CalendarAvailableTimeslots[string][number]; topOffsetMinutes: number }[] = [];

        let firstSlotIndex = -1;
        let lastSlotIndex = -1;
        let areAllSlotsAway = true;

        slotsForToday?.forEach((slot, index) => {
            const startTime = dayjs(slot.start).tz(timezone);
            const topOffsetMinutes = (startTime.hour() - startHour) * 60 + startTime.minute();
            calculatedSlots.push({ slot, topOffsetMinutes });

            if (!slot.away) {
                areAllSlotsAway = false;
            } else {
                if (firstSlotIndex === -1) firstSlotIndex = index;
                lastSlotIndex = index;
            }
        });

        if (areAllSlotsAway && firstSlotIndex !== -1) {
            const firstSlot = slotsForToday[firstSlotIndex];
            const lastSlot = slotsForToday[lastSlotIndex];
            const startEndTimeDuration = dayjs(lastSlot.end).diff(dayjs(firstSlot.start), 'minutes');

            if (firstSlot.reason !== 'PUBLIC_HOLIDAY' && !firstSlot.showNotePublicly) return null;

            return { slots: calculatedSlots, startEndTimeDuration, firstSlot };
        }

        return { slots: calculatedSlots, startEndTimeDuration: 0, firstSlot: undefined };
    }, [slotsForToday, startHour, timezone]);

    if (slots === null) return null;

    if (slots.startEndTimeDuration) {
        const { firstSlot, startEndTimeDuration } = slots;
        return (
            <CustomCell
                timeSlot={dayjs(firstSlot?.start).tz(timezone)}
                topOffsetMinutes={slots.slots[0]?.topOffsetMinutes}
                startEndTimeDuration={startEndTimeDuration}
            >
                <OutOfOfficeSlot
                    reason={firstSlot?.reason}
                    notes={firstSlot?.notes}
                    showNotePublicly={firstSlot?.showNotePublicly}
                    borderDashed={false}
                    date={dateFormatted}
                    className="pb-0"
                />
            </CustomCell>
        );
    }

    return (
        <>
            {slots.slots.map((slot, index) => (
                <Cell key={index} timeSlot={dayjs(slot.slot.start).tz(timezone)} topOffsetMinutes={slot.topOffsetMinutes} />
            ))}
        </>
    );
}

type CellProps = {
    isDisabled?: boolean;
    topOffsetMinutes?: number;
    timeSlot: Dayjs;
};

function Cell({ isDisabled, topOffsetMinutes, timeSlot }: CellProps) {
    const { onEmptyCellClick, hoverEventDuration, timezone, timeFormat } = useCalendarStore(
        useShallow((state) => ({
            onEmptyCellClick: state.onEmptyCellClick,
            hoverEventDuration: state.hoverEventDuration,
            timezone: state.timezone,
            timeFormat: state.timeFormat ?? 24,
        })),
    );

    return (
        <div
            className={cn(
                'group flex w-[calc(100%-1px)] items-center justify-center',
                isDisabled && 'pointer-events-none',
                !isDisabled && 'bg-background',
                topOffsetMinutes && 'absolute',
            )}
            data-disabled={isDisabled}
            data-slot={timeSlot.toISOString()}
            data-testid="calendar-empty-cell"
            style={{
                height: `calc(${hoverEventDuration}*var(--one-minute-height))`,
                overflow: 'visible',
                top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
            }}
            onClick={() => onEmptyCellClick?.(timeSlot.toDate())}
        >
            {!isDisabled && hoverEventDuration !== 0 && (
                <div
                    className={cn(
                        'absolute hidden rounded-[4px] bg-primary p-[6px] text-xs leading-5 font-semibold text-primary-foreground group-hover:flex group-hover:cursor-pointer',
                        hoverEventDuration && hoverEventDuration > 15 && 'items-start pt-3',
                        hoverEventDuration && hoverEventDuration < 15 && 'items-center',
                    )}
                    style={{
                        height: `calc(${hoverEventDuration}*var(--one-minute-height) - 2px)`,
                        zIndex: 80,
                        width: 'calc(100% - 2px)',
                    }}
                >
                    <div className="leading-0 text-ellipsis">{formatTime(timeSlot, timezone, timeFormat)}</div>
                </div>
            )}
        </div>
    );
}

function CustomCell({
    timeSlot,
    children,
    topOffsetMinutes,
    startEndTimeDuration,
}: CellProps & { children: React.ReactNode; startEndTimeDuration?: number }) {
    return (
        <div
            className="group absolute z-65 flex w-[calc(100%-1px)] items-center justify-center bg-background"
            data-slot={timeSlot.toISOString()}
            style={{
                top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
                overflow: 'visible',
            }}
        >
            <div
                className="cursor-pointer rounded-[4px] bg-background p-[6px] text-xs font-semibold"
                style={{ height: `calc(${startEndTimeDuration}*var(--one-minute-height) - 2px)`, width: 'calc(100% - 2px)' }}
            >
                {children}
            </div>
        </div>
    );
}
