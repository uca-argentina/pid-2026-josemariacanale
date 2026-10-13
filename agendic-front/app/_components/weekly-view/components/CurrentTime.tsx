'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/react/shallow';
import { useCalendarStore } from '../state/store';
import { formatTime, getDaysBetweenDates } from '../utils';

function calculateMinutesFromStart(startHour: number, currentHour: number, currentMinute: number) {
    return currentHour * 60 + currentMinute - startHour * 60;
}

/**
 * La línea de la hora actual con su etiqueta, solo en la semana que contiene hoy; al montar scrollea hasta ella.
 *
 * La posición y la etiqueta se calculan en un effect, así el server no pinta una hora que ya cambió al hidratar.
 */
export function CurrentTime({
    timezone,
    scrollToCurrentTime = true,
    updateOnFocus = false,
}: {
    timezone: string;
    scrollToCurrentTime?: boolean;
    updateOnFocus?: boolean;
}) {
    const currentTimeRef = useRef<HTMLDivElement>(null);
    const [scrolledIntoView, setScrolledIntoView] = useState(false);
    const [current, setCurrent] = useState<{ pos: number; label: string } | null>(null);
    const { startHour, endHour, timeFormat, startDate, endDate } = useCalendarStore(
        useShallow((state) => ({
            startHour: state.startHour || 0,
            endHour: state.endHour || 23,
            timeFormat: state.timeFormat ?? 24,
            startDate: state.startDate,
            endDate: state.endDate,
        })),
    );

    const updateCurrentTimePosition = useCallback(() => {
        const currentDateTime = dayjs().tz(timezone);
        const currentHour = currentDateTime.hour();
        const today = currentDateTime.format('YYYY-MM-DD');
        const inWeek = getDaysBetweenDates(startDate, endDate, timezone).some((day) => day.format('YYYY-MM-DD') === today);
        if (!inWeek || currentHour > endHour || currentHour < startHour) {
            setCurrent(null);
            return;
        }
        setCurrent({
            pos: calculateMinutesFromStart(startHour, currentHour, currentDateTime.minute()),
            label: formatTime(currentDateTime, timezone, timeFormat),
        });
    }, [timezone, startHour, endHour, timeFormat, startDate, endDate]);

    useEffect(() => {
        const frame = requestAnimationFrame(updateCurrentTimePosition);
        if (!scrollToCurrentTime || !currentTimeRef.current || scrolledIntoView) return () => cancelAnimationFrame(frame);
        const timeout = setTimeout(() => {
            if (currentTimeRef.current?.style.visibility === 'hidden') return;
            currentTimeRef.current?.scrollIntoView({ block: 'center' });
            setScrolledIntoView(true);
        }, 100);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timeout);
        };
    }, [updateCurrentTimePosition, scrolledIntoView, scrollToCurrentTime]);

    useEffect(() => {
        if (!updateOnFocus) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') updateCurrentTimePosition();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [updateOnFocus, updateCurrentTimePosition]);

    return (
        <div
            ref={currentTimeRef}
            className="absolute top-0 flex h-px items-center justify-center text-xs"
            aria-hidden="true"
            style={{
                top: `calc(${current?.pos ?? 0}*var(--one-minute-height) + var(--calendar-offset-top))`,
                zIndex: 70,
                visibility: current ? 'visible' : 'hidden',
            }}
        >
            <div className="w-16 pr-2 text-right font-medium text-primary">{current?.label}</div>
            <div className="h-3 w-px bg-primary" />
            <div className="h-px w-screen bg-primary" />
        </div>
    );
}
