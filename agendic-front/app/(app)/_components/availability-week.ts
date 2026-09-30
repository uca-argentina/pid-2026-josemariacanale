import type { AvailabilityInterval as ApiInterval } from '@/src/entities/models/availability';

/** Una Franja en el editor: `['HH:mm', 'HH:mm']` en 24 h. Nunca cruza la medianoche. */
export type AvailabilityInterval = [from: string, to: string];

/** Nombres de los días, lunes primero. */
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Nombres cortos de los días, lunes primero. */
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const DEFAULT_INTERVAL: AvailabilityInterval = ['09:00', '18:00'];

/** La Availability por defecto: lunes a viernes de 09:00 a 18:00. */
export const DEFAULT_DAYS: AvailabilityInterval[][] = DAY_NAMES.map((_, i) => (i < 5 ? [DEFAULT_INTERVAL] : []));

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** De 00:00 a 23:45, cada 15 minutos. */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => toTime(i * 15));
const LAST_TIME = TIME_OPTIONS[TIME_OPTIONS.length - 1];

const byStart = (a: AvailabilityInterval, b: AvailabilityInterval) => a[0].localeCompare(b[0]);

/** La Franja que suma el `+`: una hora desde el fin de la última, recortada al final del día. */
export function nextInterval(intervals: AvailabilityInterval[]): AvailabilityInterval | null {
    if (intervals.length === 0) return DEFAULT_INTERVAL;
    const from = intervals.map(([, to]) => to).sort().at(-1)!;
    if (from >= LAST_TIME) return null;
    return [from, toTime(Math.min(toMinutes(from) + 60, toMinutes(LAST_TIME)))];
}

/** Índices de las Franjas que terminan antes de empezar o se pisan con otra. Pegadas (9–17 y 17–18) valen. */
export function invalidIntervals(intervals: AvailabilityInterval[]): number[] {
    return intervals.flatMap(([from, to], i) =>
        from >= to || intervals.some((other, j) => j !== i && from < other[1] && other[0] < to) ? [i] : [],
    );
}

/** Si ninguna Franja del día es vacía, invertida ni solapada. */
export const intervalsValid = (intervals: AvailabilityInterval[]) => invalidIntervals(intervals).length === 0;

const formatInterval = ([from, to]: AvailabilityInterval) => `${from} - ${to}`;

function dayRuns(days: number[]): string {
    const runs: number[][] = [];
    for (const day of days) {
        const last = runs.at(-1);
        if (last && last.at(-1) === day - 1) last.push(day);
        else runs.push([day]);
    }
    return runs
        .map((run) => (run.length === 1 ? DAY_SHORT[run[0]] : `${DAY_SHORT[run[0]]} - ${DAY_SHORT[run.at(-1)!]}`))
        .join(', ');
}

/** Una línea por Franja distinta con los días que la tienen: `"Lun, Jue - Vie, 08:00 - 13:00"`. */
export function summarize(days: AvailabilityInterval[][]): string[] {
    const daysByInterval = new Map<string, number[]>();
    days.forEach((intervals, day) => {
        for (const interval of [...intervals].sort(byStart)) {
            const key = formatInterval(interval);
            daysByInterval.set(key, [...(daysByInterval.get(key) ?? []), day]);
        }
    });
    return [...daysByInterval].map(([interval, ds]) => `${dayRuns(ds)}, ${interval}`);
}

/** Las Franjas de un día en una línea: `"09:00 - 13:00, 14:00 - 18:00"`. */
export const formatIntervals = (intervals: AvailabilityInterval[]) => intervals.map(formatInterval).join(', ');

/** Los días del editor, lunes primero: la Franja que manda el back (`weekday` 0 = domingo) cae en el índice `(weekday + 6) % 7`. */
export function toWeek(intervals: ApiInterval[]): AvailabilityInterval[][] {
    const week: AvailabilityInterval[][] = DAY_NAMES.map(() => []);
    for (const { weekday, startTime, endTime } of [...intervals].sort((a, b) => a.startTime.localeCompare(b.startTime)))
        week[(weekday + 6) % 7].push([startTime, endTime]);
    return week;
}

/** El set entero de Franjas que espera el back; un día sin Franjas simplemente no aparece. */
export function toIntervals(week: AvailabilityInterval[][]): ApiInterval[] {
    return week.flatMap((day, i) => day.map(([startTime, endTime]) => ({ weekday: (i + 1) % 7, startTime, endTime })));
}

/** Si el editor puede guardar: ningún día tiene una Franja vacía, invertida o solapada. */
export const weekValid = (week: AvailabilityInterval[][]) => week.every(intervalsValid);
