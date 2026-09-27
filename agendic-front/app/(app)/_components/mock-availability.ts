// ponytail: los datos de este archivo son mock. Cuando exista el dominio de Availability en src/, la página los
// recibe por props desde un controller, y las reglas (`invalidIntervals`, `nextInterval`, `setOverrides`) pasan
// a src/entities y a los use cases.

/** Una Franja: `['HH:MM', 'HH:MM']` en 24 h. Nunca cruza la medianoche. */
export type AvailabilityInterval = [from: string, to: string];

/** Una Anulación: reemplaza las Franjas de una fecha (`YYYY-MM-DD`). Sin Franjas es día libre. */
export interface AvailabilityOverride {
    date: string;
    intervals: AvailabilityInterval[];
}

/** Horas laborables con nombre de un Empleado. `days[0]` es el lunes y `days[6]` el domingo. */
export interface Availability {
    id: string;
    name: string;
    isDefault: boolean;
    days: AvailabilityInterval[][];
    overrides: AvailabilityOverride[];
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const DEFAULT_INTERVAL: AvailabilityInterval = ['09:00', '18:00'];

/** La Availability por defecto: lunes a viernes de 09:00 a 18:00. */
export const DEFAULT_DAYS: AvailabilityInterval[][] = DAY_NAMES.map((_, i) => (i < 5 ? [DEFAULT_INTERVAL] : []));

/** Solo lectura: las horas son las locales de cada Sucursal (la zona es de la Sucursal, no de la Availability). */
export const BRANCH_TIME_ZONE = 'America/Argentina/Buenos_Aires';

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

export const intervalsValid = (intervals: AvailabilityInterval[]) => invalidIntervals(intervals).length === 0;

/**
 * Guarda la misma Anulación en cada fecha de `dates`, reemplazando las que ya había.
 * `replaced` es la fecha de la Anulación que se estaba editando: sale aunque la hayan destildado.
 */
export function setOverrides(
    overrides: AvailabilityOverride[],
    dates: string[],
    intervals: AvailabilityInterval[],
    replaced?: string,
): AvailabilityOverride[] {
    return [
        ...overrides.filter((o) => o.date !== replaced && !dates.includes(o.date)),
        ...dates.map((date) => ({ date, intervals })),
    ].sort((a, b) => a.date.localeCompare(b.date));
}

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

export const formatIntervals = (intervals: AvailabilityInterval[]) => intervals.map(formatInterval).join(', ');

export const myAvailabilities: Availability[] = [
    {
        id: 'laboral',
        name: 'Horario laboral',
        isDefault: true,
        days: DAY_NAMES.map((_, i) => (i < 5 ? [['09:00', '17:00']] : [])),
        overrides: [
            { date: '2026-10-12', intervals: [] },
            { date: '2026-10-23', intervals: [['09:00', '13:00']] },
        ],
    },
    {
        id: 'tarde',
        name: 'Horario de tarde',
        isDefault: false,
        days: [
            [['08:00', '13:00'], ['17:00', '20:00']],
            [['14:00', '20:00']],
            [['14:00', '20:00']],
            [['08:00', '13:00'], ['17:00', '20:00']],
            [['14:00', '20:00']],
            [['10:00', '13:00']],
            [],
        ],
        overrides: [],
    },
    // Ningún Servicio la usa: es la única que se puede eliminar sin aviso.
    { id: 'sabados', name: 'Sábados', isDefault: false, days: [[], [], [], [], [], [['10:00', '14:00']], []], overrides: [] },
];
