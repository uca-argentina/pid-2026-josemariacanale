import {
    DEFAULT_DAYS,
    intervalsValid,
    invalidIntervals,
    fromFormSchedule,
    intervalAsString,
    intervalsFromSchedule,
    sortIntervalStrings,
    toDateRanges,
    toFormSchedule,
    toTimeRanges,
    toWeek,
    weekdays,
    weekValid,
} from '@/app/(app)/_components/availability-week';
import type { TimeRange } from '@/src/entities/models/availability';

const r = (start: string, end: string): TimeRange => ({ start, end });

const week = (byDay: Partial<Record<number, TimeRange[]>>): TimeRange[][] =>
    Array.from({ length: 7 }, (_, i) => byDay[i] ?? []);

describe('intervalsFromSchedule', () => {
    it('agrupa los días que comparten inicio y fin', () => {
        const nineToFive = [r('09:00', '17:00')];
        expect(intervalsFromSchedule(week({ 1: nineToFive, 2: [r('09:00', '17:00'), r('18:00', '20:00')], 5: nineToFive }))).toEqual([
            { days: [1, 2, 5], startTime: '09:00', endTime: '17:00' },
            { days: [2], startTime: '18:00', endTime: '20:00' },
        ]);
    });

    it('no devuelve nada si no hay Franjas', () => {
        expect(intervalsFromSchedule(week({}))).toEqual([]);
    });
});

describe('intervalAsString', () => {
    const interval = (days: number[], startTime = '09:00', endTime = '17:00') => ({ days, startTime, endTime });

    it('agrupa días consecutivos en un tramo', () => {
        expect(intervalAsString(interval([1, 2, 3, 4, 5]), { hour12: false })).toBe('lun - vie, 09:00 - 17:00');
    });

    it('separa con coma los días sueltos y los tramos', () => {
        expect(intervalAsString(interval([1, 4, 5]), { hour12: false })).toBe('lun, jue - vie, 09:00 - 17:00');
    });

    it('usa el formato de 12 horas', () => {
        expect(intervalAsString(interval([1], '00:30', '13:00'), { hour12: true }).replace(/\s/g, ' ')).toBe('lun, 12:30 a. m. - 1:00 p. m.');
    });
});

describe('sortIntervalStrings', () => {
    const lines = ['dom, 10:00 - 12:00', 'mié, 08:00 - 13:00', 'lun, 09:00 - 17:00'];

    it('ordena las líneas desde el primer día de la semana', () => {
        expect([...lines].sort(sortIntervalStrings(1))).toEqual(['lun, 09:00 - 17:00', 'mié, 08:00 - 13:00', 'dom, 10:00 - 12:00']);
        expect([...lines].sort(sortIntervalStrings(0))).toEqual(['dom, 10:00 - 12:00', 'lun, 09:00 - 17:00', 'mié, 08:00 - 13:00']);
    });
});

describe('invalidIntervals / intervalsValid', () => {
    it('acepta un día sin Franjas', () => {
        expect(intervalsValid([])).toBe(true);
    });

    it('acepta dos Franjas pegadas', () => {
        expect(intervalsValid([r('17:00', '18:00'), r('09:00', '17:00')])).toBe(true);
    });

    it('marca las dos Franjas que se solapan', () => {
        expect(invalidIntervals([r('09:00', '17:00'), r('12:00', '13:00'), r('16:00', '18:00')])).toEqual([0, 1, 2]);
        expect(invalidIntervals([r('09:00', '12:00'), r('11:00', '13:00'), r('14:00', '15:00')])).toEqual([0, 1]);
    });

    it('marca una Franja que termina antes de empezar o vacía', () => {
        expect(invalidIntervals([r('09:00', '12:00'), r('18:00', '14:00')])).toEqual([1]);
        expect(intervalsValid([r('09:00', '09:00')])).toBe(false);
    });
});

const empty = () => Array.from({ length: 7 }, () => [] as TimeRange[]);

describe('toWeek', () => {
    it('arranca la semana el lunes: el índice 1 del back (lunes) cae en el 0 y el 0 (domingo) en el 6', () => {
        const schedule = empty();
        schedule[0] = [{ start: '10:00', end: '12:00' }];
        schedule[1] = [{ start: '09:00', end: '13:00' }];
        const result = toWeek(schedule);
        expect(result[0]).toEqual([r('09:00', '13:00')]);
        expect(result[6]).toEqual([r('10:00', '12:00')]);
        expect(result[1]).toEqual([]);
    });

    it('ordena las Franjas de un día por hora de inicio', () => {
        const schedule = empty();
        schedule[2] = [{ start: '17:00', end: '20:00' }, { start: '08:00', end: '13:00' }];
        expect(toWeek(schedule)[1]).toEqual([r('08:00', '13:00'), r('17:00', '20:00')]);
    });

    it('sin Franjas devuelve los 7 días vacíos', () => {
        expect(toWeek(empty())).toEqual(week({}));
    });
});

describe('toFormSchedule / fromFormSchedule', () => {
    it('va y vuelve sin perder Franjas, con el domingo en el índice 0', () => {
        const schedule = week({ 0: [r('10:00', '12:00')], 2: [r('08:00', '13:00'), r('17:00', '23:59')], 6: [r('00:00', '09:30')] });
        const form = toFormSchedule(schedule);
        expect(form).toHaveLength(7);
        expect(form[0][0].start).toEqual(new Date(Date.UTC(1970, 0, 1, 10)));
        expect(fromFormSchedule(form)).toEqual(schedule);
    });

    it('ordena las Franjas de cada día por hora de inicio', () => {
        const form = toFormSchedule(week({ 3: [r('17:00', '20:00'), r('08:00', '13:00')] }));
        expect(fromFormSchedule(form)[3]).toEqual([r('08:00', '13:00'), r('17:00', '20:00')]);
    });

    it('conserva los días sin Franjas', () => {
        expect(fromFormSchedule(toFormSchedule(week({})))).toEqual(week({}));
    });

    it('una Anulación de día libre (ranges: []) sigue siendo []', () => {
        const override = { date: '2026-12-25', ranges: [] as TimeRange[] };
        expect(toTimeRanges(toDateRanges(override.ranges))).toEqual([]);
        expect({ ...override, ranges: toTimeRanges(toDateRanges(override.ranges)) }).toEqual(override);
    });

    it('el fin del día (23:59) es el último instante del día y vuelve como 23:59', () => {
        const [range] = toDateRanges([r('23:00', '23:59')]);
        expect(range.end.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
        expect(toTimeRanges([range])).toEqual([r('23:00', '23:59')]);
    });
});

describe('weekdays', () => {
    it.each([0, 1, 2, 3, 4, 5, 6])('con weekStart %i arranca en ese día y sigue en orden, con el domingo en el índice 0', (weekStart) => {
        const days = weekdays(weekStart);
        expect(days.map(({ index }) => index)).toEqual(Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7));
        expect(days.find(({ name }) => name === 'domingo')?.index).toBe(0);
        expect(days.find(({ name }) => name === 'lunes')?.index).toBe(1);
    });
});

describe('weekValid', () => {
    it('acepta una semana con días sin Franjas y Franjas pegadas', () => {
        expect(weekValid(week({ 0: [r('09:00', '17:00'), r('17:00', '18:00')] }))).toBe(true);
    });

    it('rechaza la semana si un solo día tiene Franjas solapadas', () => {
        expect(weekValid(week({ 0: [r('09:00', '17:00')], 3: [r('09:00', '12:00'), r('11:00', '13:00')] }))).toBe(false);
    });

    it('rechaza la semana si un día tiene una Franja vacía o invertida', () => {
        expect(weekValid(week({ 4: [r('09:00', '09:00')] }))).toBe(false);
        expect(weekValid(week({ 4: [r('18:00', '14:00')] }))).toBe(false);
    });

    it('acepta la Availability por defecto', () => {
        expect(weekValid(DEFAULT_DAYS)).toBe(true);
    });
});
