'use client';

import { useEffect, useRef } from 'react';
import { formatTimeIn, minutesFromStart, type TimeFormat } from './grid-math';

interface CurrentTimeProps {
    now: number;
    timeZone: string;
    timeFormat: TimeFormat;
}

/** La línea de la hora actual con su etiqueta; al montar scrollea hasta ella. */
export function CurrentTime({ now, timeZone, timeFormat }: CurrentTimeProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current?.scrollIntoView({ block: 'center' });
    }, []);

    return (
        <div
            ref={ref}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-[70] flex h-px items-center text-xs"
            style={{ top: `calc(${minutesFromStart(now, timeZone)} * var(--one-minute-height))` }}
        >
            <div className="w-14 pr-2 text-right font-medium text-primary">{formatTimeIn(now, timeZone, timeFormat)}</div>
            <div className="h-px flex-1 bg-primary" />
        </div>
    );
}
