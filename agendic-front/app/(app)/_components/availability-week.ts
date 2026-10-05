import type { TimeRange } from '@/src/entities/models/availability';

/** Nombres de los días, lunes primero. */
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Nombres cortos de los días, lunes primero. */
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** La Franja que se agrega a un día vacío: de 09:00 a 18:00. */
export const DEFAULT_INTERVAL: TimeRange = { start: '09:00', end: '18:00' };

/** La Availability por defecto: lunes a viernes de 09:00 a 18:00. */
export const DEFAULT_DAYS: TimeRange[][] = DAY_NAMES.map((_, i) => (i < 5 ? [DEFAULT_INTERVAL] : []));

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** De 00:00 a 23:45, cada 15 minutos. */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => toTime(i * 15));
const LAST_TIME = TIME_OPTIONS[TIME_OPTIONS.length - 1];

/** Para `sort`: las Franjas por hora de inicio. */
export const byStart = (a: TimeRange, b: TimeRange) => a.start.localeCompare(b.start);

/** La Franja que suma el `+`: una hora desde el fin de la última, recortada al final del día. */
export function nextInterval(intervals: TimeRange[]): TimeRange | null {
    if (intervals.length === 0) return DEFAULT_INTERVAL;
    const start = intervals.map(({ end }) => end).sort().at(-1)!;
    if (start >= LAST_TIME) return null;
    return { start, end: toTime(Math.min(toMinutes(start) + 60, toMinutes(LAST_TIME))) };
}

/** Índices de las Franjas que terminan antes de empezar o se pisan con otra. Pegadas (9–17 y 17–18) valen. */
export function invalidIntervals(intervals: TimeRange[]): number[] {
    return intervals.flatMap(({ start, end }, i) =>
        start >= end || intervals.some((other, j) => j !== i && start < other.end && other.start < end) ? [i] : [],
    );
}

/** Si ninguna Franja del día es vacía, invertida ni solapada. */
export const intervalsValid = (intervals: TimeRange[]) => invalidIntervals(intervals).length === 0;

const formatInterval = ({ start, end }: TimeRange) => `${start} - ${end}`;

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
export function summarize(days: TimeRange[][]): string[] {
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
export const formatIntervals = (intervals: TimeRange[]) => intervals.map(formatInterval).join(', ');

/** Los días del editor, lunes primero: el `schedule` del back (índice 0 = domingo) rota un lugar, el día `d` cae en `(d + 6) % 7`. */
export function toWeek(schedule: TimeRange[][]): TimeRange[][] {
    const week: TimeRange[][] = DAY_NAMES.map(() => []);
    schedule.forEach((ranges, day) => (week[(day + 6) % 7] = [...ranges].sort(byStart)));
    return week;
}

/** El `schedule` que espera el back: 7 días, domingo primero, cada uno ordenado por inicio; un día sin Franjas es `[]`. */
export const toSchedule = (week: TimeRange[][]): TimeRange[][] =>
    Array.from({ length: 7 }, (_, day) => [...week[(day + 6) % 7]].sort(byStart));

/** Si el editor puede guardar: ningún día tiene una Franja vacía, invertida o solapada. */
export const weekValid = (week: TimeRange[][]) => week.every(intervalsValid);
