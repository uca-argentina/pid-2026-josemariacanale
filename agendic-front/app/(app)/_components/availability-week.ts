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

/** Una Franja con todos los días de la semana que la tienen (0 = domingo). */
export interface AvailabilityInterval {
    days: number[];
    startTime: string;
    endTime: string;
}

const LOCALE = 'es-AR';

/**
 * Agrupa las Franjas del `schedule` del back (índice 0 = domingo) por inicio y fin: una por horario, con
 * todos los días que lo tienen.
 */
export function intervalsFromSchedule(schedule: TimeRange[][]): AvailabilityInterval[] {
    return schedule.reduce((intervals: AvailabilityInterval[], times: TimeRange[], day: number) => {
        const filteredTimes = times.filter((time) => {
            const idx = intervals.findIndex((interval) => interval.startTime === time.start && interval.endTime === time.end);
            if (idx !== -1) {
                intervals[idx].days.push(day);
                return false;
            }
            return true;
        });
        filteredTimes.forEach((time) => intervals.push({ days: [day], startTime: time.start, endTime: time.end }));
        return intervals;
    }, []);
}

/** La fecha de esta semana que cae en `day` (0 = domingo). */
function getDateForWeekday(day: number): Date {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + day - today.getDay());
    return target;
}

/** El nombre del día `day` (0 = domingo): `"lun"` en `short`, `"lunes"` en `long`. */
function nameOfDay(day: number, format: 'short' | 'long' = 'long'): string {
    return new Intl.DateTimeFormat(LOCALE, { weekday: format }).format(getDateForWeekday(day));
}

/** Los nombres de los siete días, empezando por `weekStart` (0 = domingo). */
function weekdayNames(weekStart = 0, format: 'short' | 'long' = 'long'): string[] {
    return Array.from({ length: 7 }, (_, i) => nameOfDay((i + weekStart) % 7, format));
}

/** Una Franja en una línea, con sus días agrupados en tramos: `"lun - vie, 09:00 - 17:00"`. */
export function intervalAsString(interval: AvailabilityInterval, { hour12 }: { hour12?: boolean }): string {
    const weekSpan = ({ days: [first, ...rest] }: AvailabilityInterval) => {
        const days = rest.reduce(
            (days, day) => {
                const last = days[days.length - 1];
                if (last.length === 1 && last[0] === day - 1) {
                    // El tramo todavía no está cerrado y el día siguiente lo continúa.
                    last.push(day);
                } else if (last[last.length - 1] === day - 1) {
                    // Tramo cerrado: si el día lo sigue, lo extiende.
                    days[days.length - 1] = [last[0], day];
                } else {
                    days.push([day]);
                }
                return days;
            },
            [[first]] as number[][],
        );
        return days.map((dayRange) => dayRange.map((day) => nameOfDay(day, 'short')).join(' - ')).join(', ');
    };

    // `HH:mm` sin zona se lee como hora local y se formatea en la misma: sale la hora tal cual.
    const formatTime = (time: string) =>
        new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: 'numeric', hour12 }).format(new Date(`1970-01-01T${time}`));

    return `${weekSpan(interval)}, ${formatTime(interval.startTime)} - ${formatTime(interval.endTime)}`;
}

/** Para `sort`: las líneas de `intervalAsString` según el primer día de la semana del Usuario (0 = domingo). */
export function sortIntervalStrings(weekStart = 0) {
    return (a: string, b: string) => {
        const weekNames = weekdayNames(weekStart, 'short');
        const weekIndex = (day: string) => {
            for (let i = 0; i < weekNames.length; i++) {
                if (day.includes(weekNames[i])) return i;
            }
            return -1;
        };
        return weekIndex(a) - weekIndex(b);
    };
}

/** Las Franjas de un día en una línea: `"09:00 - 13:00, 14:00 - 18:00"`. */
export const formatIntervals = (intervals: TimeRange[]) => intervals.map(formatInterval).join(', ');

/** Los días del editor, lunes primero: el `schedule` del back (índice 0 = domingo) rota un lugar, el día `d` cae en `(d + 6) % 7`. */
export function toWeek(schedule: TimeRange[][]): TimeRange[][] {
    const week: TimeRange[][] = DAY_NAMES.map(() => []);
    schedule.forEach((ranges, day) => (week[(day + 6) % 7] = [...ranges].sort(byStart)));
    return week;
}

/** Una Franja como la maneja el editor copiado de cal.diy: la hora del día como instante UTC del 1970-01-01. */
export type DateRange = { start: Date; end: Date };

/** El fin del día de cal.diy: `23:59` es `23:59:59.999`, para que ninguna Franja siguiente quepa después. */
const END_OF_DAY = '23:59';
/** `23:59:59.999` en milisegundos desde la medianoche UTC. */
export const END_OF_DAY_MS = 24 * 60 * 60 * 1000 - 1;

/** `HH:mm` → el instante UTC de esa hora el 1970-01-01. */
const toDate = (time: string) => new Date(time === END_OF_DAY ? END_OF_DAY_MS : toMinutes(time) * 60_000);

/** El instante → su `HH:mm` UTC; los segundos se descartan. */
const toHHmm = (date: Date) => date.toISOString().slice(11, 16);

/** Las Franjas del back (`HH:mm`) como las ve el editor copiado de cal.diy (`Date`). Conserva el orden. */
export const toDateRanges = (ranges: TimeRange[]): DateRange[] =>
    ranges.map(({ start, end }) => ({ start: toDate(start), end: toDate(end) }));

/** Las Franjas del editor (`Date`) como las manda el back (`HH:mm`). Conserva el orden; `[]` sigue siendo `[]`. */
export const toTimeRanges = (ranges: DateRange[]): TimeRange[] =>
    ranges.map(({ start, end }) => ({ start: toHHmm(start), end: toHHmm(end) }));

/** El `schedule` del back al formulario del editor: mismo orden de días (0 = domingo), Franjas por hora de inicio. */
export const toFormSchedule = (schedule: TimeRange[][]): DateRange[][] =>
    schedule.map((ranges) => toDateRanges([...ranges].sort(byStart)));

/** El formulario del editor al `schedule` que espera el back: 7 días, domingo primero, Franjas por hora de inicio. */
export const fromFormSchedule = (days: DateRange[][]): TimeRange[][] =>
    days.map((ranges) => toTimeRanges(ranges).sort(byStart));

/**
 * Los días de la semana empezando en `weekStart` (0 = domingo), cada uno con su índice en el `schedule` del back y su
 * nombre. El índice no depende de `weekStart`: el domingo es siempre el 0. Los nombres salen de fechas de enero de 2024,
 * que empezó el 7 siendo domingo.
 */
export function weekdays(weekStart: number): { index: number; name: string }[] {
    const format = new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => {
        const index = (weekStart + i) % 7;
        return { index, name: format.format(new Date(Date.UTC(2024, 0, 7 + index))) };
    });
}

/** Si el editor puede guardar: ningún día tiene una Franja vacía, invertida o solapada. */
export const weekValid = (week: TimeRange[][]) => week.every(intervalsValid);
