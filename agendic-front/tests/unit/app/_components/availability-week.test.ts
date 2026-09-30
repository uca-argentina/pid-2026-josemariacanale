import {
    DEFAULT_DAYS,
    intervalsValid,
    invalidIntervals,
    nextInterval,
    summarize,
    toIntervals,
    toWeek,
    weekValid,
    type AvailabilityInterval,
} from '@/app/(app)/_components/availability-week';

const week = (byDay: Partial<Record<number, AvailabilityInterval[]>>): AvailabilityInterval[][] =>
    Array.from({ length: 7 }, (_, i) => byDay[i] ?? []);

describe('summarize', () => {
    it('agrupa días consecutivos en un tramo', () => {
        expect(summarize(DEFAULT_DAYS)).toEqual(['Lun - Vie, 09:00 - 18:00']);
    });

    it('separa con coma los días sueltos y los tramos', () => {
        const morning: AvailabilityInterval = ['08:00', '13:00'];
        expect(summarize(week({ 0: [morning], 3: [morning], 4: [morning] }))).toEqual(['Lun, Jue - Vie, 08:00 - 13:00']);
    });

    it('da una línea por Franja distinta, en orden de aparición', () => {
        const days = week({
            0: [['08:00', '13:00'], ['17:00', '20:00']],
            1: [['09:00', '17:00']],
            2: [['09:00', '17:00']],
            3: [['08:00', '13:00'], ['17:00', '20:00']],
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
        expect(nextInterval([['09:00', '13:00']])).toEqual(['13:00', '14:00']);
    });

    it('sin Franjas propone el horario por defecto', () => {
        expect(nextInterval([])).toEqual(['09:00', '18:00']);
    });

    it('se recorta al final del día', () => {
        expect(nextInterval([['09:00', '23:15']])).toEqual(['23:15', '23:45']);
    });

    it('no propone nada si el día ya está lleno', () => {
        expect(nextInterval([['09:00', '23:45']])).toBeNull();
    });
});

describe('invalidIntervals / intervalsValid', () => {
    it('acepta un día sin Franjas', () => {
        expect(intervalsValid([])).toBe(true);
    });

    it('acepta dos Franjas pegadas', () => {
        expect(intervalsValid([['17:00', '18:00'], ['09:00', '17:00']])).toBe(true);
    });

    it('marca las dos Franjas que se solapan', () => {
        expect(invalidIntervals([['09:00', '17:00'], ['12:00', '13:00'], ['16:00', '18:00']])).toEqual([0, 1, 2]);
        expect(invalidIntervals([['09:00', '12:00'], ['11:00', '13:00'], ['14:00', '15:00']])).toEqual([0, 1]);
    });

    it('marca una Franja que termina antes de empezar o vacía', () => {
        expect(invalidIntervals([['09:00', '12:00'], ['18:00', '14:00']])).toEqual([1]);
        expect(intervalsValid([['09:00', '09:00']])).toBe(false);
    });
});

describe('toWeek', () => {
    it('arranca la semana el lunes: weekday 1 cae en el índice 0 y weekday 0 (domingo) en el 6', () => {
        const result = toWeek([
            { weekday: 0, startTime: '10:00', endTime: '12:00' },
            { weekday: 1, startTime: '09:00', endTime: '13:00' },
        ]);
        expect(result[0]).toEqual([['09:00', '13:00']]);
        expect(result[6]).toEqual([['10:00', '12:00']]);
        expect(result[1]).toEqual([]);
    });

    it('ordena las Franjas de un día por hora de inicio', () => {
        const result = toWeek([
            { weekday: 2, startTime: '17:00', endTime: '20:00' },
            { weekday: 2, startTime: '08:00', endTime: '13:00' },
        ]);
        expect(result[1]).toEqual([['08:00', '13:00'], ['17:00', '20:00']]);
    });

    it('sin Franjas devuelve los 7 días vacíos', () => {
        expect(toWeek([])).toEqual(week({}));
    });
});

describe('toIntervals', () => {
    it('manda el set entero con weekday 0 = domingo, y los días sin Franjas no aparecen', () => {
        expect(toIntervals(week({ 0: [['09:00', '13:00']], 6: [['10:00', '12:00']] }))).toEqual([
            { weekday: 1, startTime: '09:00', endTime: '13:00' },
            { weekday: 0, startTime: '10:00', endTime: '12:00' },
        ]);
    });

    it('es la inversa de toWeek', () => {
        const days = week({ 2: [['08:00', '13:00'], ['17:00', '20:00']], 6: [['10:00', '12:00']] });
        expect(toWeek(toIntervals(days))).toEqual(days);
    });
});

describe('weekValid', () => {
    it('acepta una semana con días sin Franjas y Franjas pegadas', () => {
        expect(weekValid(week({ 0: [['09:00', '17:00'], ['17:00', '18:00']] }))).toBe(true);
    });

    it('rechaza la semana si un solo día tiene Franjas solapadas', () => {
        expect(weekValid(week({ 0: [['09:00', '17:00']], 3: [['09:00', '12:00'], ['11:00', '13:00']] }))).toBe(false);
    });

    it('rechaza la semana si un día tiene una Franja vacía o invertida', () => {
        expect(weekValid(week({ 4: [['09:00', '09:00']] }))).toBe(false);
        expect(weekValid(week({ 4: [['18:00', '14:00']] }))).toBe(false);
    });

    it('acepta la Availability por defecto', () => {
        expect(weekValid(DEFAULT_DAYS)).toBe(true);
    });
});
