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

/** Nombres abreviados de los días del `schedule` del back: el índice 0 es el domingo. */
const WEEKDAY_ABBR = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];

/** `9:00` en 24 h, `9:00 a. m.` en 12 h. */
function formatTime(time: string, timeFormat: 12 | 24): string {
    const hour = Number(time.slice(0, 2));
    const minutes = time.slice(3);
    if (timeFormat === 24) return `${hour}:${minutes}`;
    return `${hour % 12 || 12}:${minutes} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}

/**
 * Resume las Franjas de una semana, una línea por Franja distinta con los días que la tienen:
 * `"lun. - vie., 9:00 - 17:00"`. Los días siguen el primer día de la semana del Usuario (`weekStart`, 0 =
 * domingo) y también el orden de las líneas. Sin Franjas, no hay líneas.
 */
export function summarizeSchedule(
    schedule: TimeRange[][],
    { timeFormat, weekStart }: { timeFormat: 12 | 24; weekStart: number },
): string[] {
    const daysByRange = new Map<string, number[]>();
    for (let offset = 0; offset < 7; offset++) {
        const day = (weekStart + offset) % 7;
        for (const range of [...(schedule[day] ?? [])].sort(byStart)) {
            const key = `${formatTime(range.start, timeFormat)} - ${formatTime(range.end, timeFormat)}`;
            daysByRange.set(key, [...(daysByRange.get(key) ?? []), offset]);
        }
    }
    return [...daysByRange]
        .map(([range, offsets]) => ({ range, offsets }))
        .sort((a, b) => a.offsets[0] - b.offsets[0])
        .map(({ range, offsets }) => {
            const runs: number[][] = [];
            for (const offset of offsets) {
                const last = runs.at(-1);
                if (last && last.at(-1) === offset - 1) last.push(offset);
                else runs.push([offset]);
            }
            const name = (offset: number) => WEEKDAY_ABBR[(weekStart + offset) % 7];
            const days = runs.map((run) => (run.length === 1 ? name(run[0]) : `${name(run[0])} - ${name(run.at(-1)!)}`));
            return `${days.join(', ')}, ${range}`;
        });
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
