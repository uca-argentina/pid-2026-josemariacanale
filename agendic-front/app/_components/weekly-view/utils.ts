import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

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

/** Los días entre dos fechas, ambos incluidos y a medianoche, hasta 7 (una semana). */
export function getDaysBetweenDates(dateFrom: Date, dateTo: Date) {
    const dates = [];
    let startDate = dayjs(dateFrom).hour(0).minute(0).second(0).millisecond(0);

    dates.push(startDate);
    const endDate = dayjs(dateTo).hour(0).minute(0).second(0).millisecond(0);

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
