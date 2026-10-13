import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { TimeFormat, TimeRange } from '../types/state';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Qué celda de la grilla convertir en fecha. */
export type GridCellToDateProps = {
    day: dayjs.Dayjs;
    gridCellIdx: number;
    totalGridCells: number;
    selectionLength: number;
    startHour: number;
    timezone: string;
};

/** La fecha y hora de una celda de la grilla dentro de `day` (que viene a inicio del día, de ahí que se sume `startHour`), en la zona `timezone`. `selectionLength` es endHour - startHour. */
export function gridCellToDateTime({
    day,
    gridCellIdx,
    totalGridCells,
    selectionLength,
    startHour,
    timezone,
}: GridCellToDateProps) {
    const minutesInSelection = (selectionLength + 1) * 60;
    const minutesPerCell = minutesInSelection / totalGridCells;
    const minutesIntoSelection = minutesPerCell * gridCellIdx;

    return dayjs(day)
        .tz(timezone)
        .startOf('day')
        .add(minutesIntoSelection, 'minutes')
        .add(startHour, 'hours');
}

/** Los días entre dos fechas, ambos incluidos y a medianoche, hasta 7 (una semana). Con `timezone`, los días se leen en esa zona. */
export function getDaysBetweenDates(dateFrom: Date, dateTo: Date, timezone?: string) {
    const dates = [];
    const atMidnight = (date: Date) => (timezone ? dayjs(date).tz(timezone).startOf('day') : dayjs(date).hour(0).minute(0).second(0).millisecond(0));
    let startDate = atMidnight(dateFrom);

    dates.push(startDate);
    const endDate = atMidnight(dateTo);

    while (startDate.isBefore(endDate)) {
        dates.push(startDate.add(1, 'day'));
        startDate = startDate.add(1, 'day');
    }

    return dates.slice(0, 7);
}

/** Las horas de la columna lateral, de `startHour` a `endHour` inclusive. */
export function getHoursToDisplay(startHour: number, endHour: number, timezone?: string) {
    const dates = [];
    let startDate = dayjs('1970-01-01').tz(timezone).hour(startHour);
    dates.push(startDate);
    const endDate = dayjs('1970-01-01').tz(timezone).hour(endHour);
    while (startDate.isBefore(endDate)) {
        dates.push(startDate.add(1, 'hour'));
        startDate = startDate.add(1, 'hour');
    }
    return dates;
}

/** El primer día (`weekStart`, 0 = domingo) de la semana de `startDate` y el que está `length` días después. Mueve `startDate`. */
export function weekdayDates(weekStart = 0, startDate: Date, length = 6) {
    const tmpStartDate = startDate;
    while (tmpStartDate.getDay() !== weekStart) {
        tmpStartDate.setDate(tmpStartDate.getDate() - 1);
    }
    return {
        startDate: tmpStartDate,
        endDate: new Date(tmpStartDate.getTime() + length * 24 * 60 * 60 * 1000),
    };
}

/** Une los tramos que se pisan o se tocan. Ordena el arreglo que recibe. */
export function mergeOverlappingDateRanges(dateRanges: TimeRange[]) {
    dateRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const mergedDateRanges: TimeRange[] = [];
    for (const currentDateRange of dateRanges) {
        const lastMergedDateRange = mergedDateRanges[mergedDateRanges.length - 1];
        if (lastMergedDateRange && lastMergedDateRange.end.getTime() >= currentDateRange.start.getTime()) {
            lastMergedDateRange.end = currentDateRange.end;
        } else {
            mergedDateRanges.push(currentDateRange);
        }
    }
    return mergedDateRanges;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** La hora de `at` en la zona `timeZone`, en 12 o 24 horas. Cambia los espacios finos que emite ICU por un espacio común. */
export function formatTime(at: Date | string | number | dayjs.Dayjs, timeZone: string, timeFormat: TimeFormat) {
    const key = `${timeZone}|${timeFormat}`;
    let formatter = timeFormatters.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('es-AR', {
            timeZone,
            hour: timeFormat === 24 ? '2-digit' : 'numeric',
            minute: '2-digit',
            hourCycle: timeFormat === 24 ? 'h23' : 'h12',
        });
        timeFormatters.set(key, formatter);
    }
    return formatter.format(dayjs.isDayjs(at) ? at.toDate() : new Date(at)).replace(/[  ]/g, ' ');
}
