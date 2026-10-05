import {
    DEFAULT_DAYS,
    intervalsValid,
    invalidIntervals,
    nextInterval,
    summarize,
    toSchedule,
    toWeek,
    weekValid,
} from '@/app/(app)/_components/availability-week';
import type { TimeRange } from '@/src/entities/models/availability';

const r = (start: string, end: string): TimeRange => ({ start, end });

const week = (byDay: Partial<Record<number, TimeRange[]>>): TimeRange[][] =>
    Array.from({ length: 7 }, (_, i) => byDay[i] ?? []);

describe('summarize', () => {
    it('agrupa días consecutivos en un tramo', () => {
        expect(summarize(DEFAULT_DAYS)).toEqual(['Lun - Vie, 09:00 - 18:00']);
    });

    it('separa con coma los días sueltos y los tramos', () => {
        const morning: TimeRange = r('08:00', '13:00');
        expect(summarize(week({ 0: [morning], 3: [morning], 4: [morning] }))).toEqual(['Lun, Jue - Vie, 08:00 - 13:00']);
    });

    it('da una línea por Franja distinta, en orden de aparición', () => {
        const days = week({
            0: [r('08:00', '13:00'), r('17:00', '20:00')],
            1: [r('09:00', '17:00')],
            2: [r('09:00', '17:00')],
            3: [r('08:00', '13:00'), r('17:00', '20:00')],
        });
        expect(summarize(days)).toEqual([
            'Lun, Jue, 08:00 - 13:00',
            'Lun, Jue, 17:00 - 20:00',
            'Mar - Mié, 09:00 - 17:00',
        ]);
    });

    it('no devuelve nada si no hay Franjas', () => {
        expect(summarize(week({}))).toEqual([]);
    });
});

describe('nextInterval', () => {
    it('agrega una hora a partir del fin de la última Franja', () => {
        expect(nextInterval([r('09:00', '13:00')])).toEqual(r('13:00', '14:00'));
    });

    it('sin Franjas propone el horario por defecto', () => {
        expect(nextInterval([])).toEqual(r('09:00', '18:00'));
    });

    it('se recorta al final del día', () => {
        expect(nextInterval([r('09:00', '23:15')])).toEqual(r('23:15', '23:45'));
    });

    it('no propone nada si el día ya está lleno', () => {
        expect(nextInterval([r('09:00', '23:45')])).toBeNull();
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

describe('toSchedule', () => {
    it('manda los 7 días con el domingo primero, y los días sin Franjas como []', () => {
        const schedule = toSchedule(week({ 0: [r('09:00', '13:00')], 6: [r('10:00', '12:00')] }));
        expect(schedule).toHaveLength(7);
        expect(schedule[1]).toEqual([{ start: '09:00', end: '13:00' }]);
        expect(schedule[0]).toEqual([{ start: '10:00', end: '12:00' }]);
        expect(schedule[2]).toEqual([]);
    });

    it('es la inversa de toWeek', () => {
        const days = week({ 2: [r('08:00', '13:00'), r('17:00', '20:00')], 6: [r('10:00', '12:00')] });
        expect(toWeek(toSchedule(days))).toEqual(days);
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
