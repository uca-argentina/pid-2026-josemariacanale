import {
    DEFAULT_DAYS,
    intervalsValid,
    invalidIntervals,
    nextInterval,
    setOverrides,
    summarize,
    type AvailabilityInterval,
    type AvailabilityOverride,
} from '@/src/entities/models/availability';

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

describe('setOverrides', () => {
    const off = (date: string): AvailabilityOverride => ({ date, intervals: [] });

    it('agrega una Anulación por fecha, ordenadas', () => {
        expect(setOverrides([off('2026-10-20')], ['2026-10-12', '2026-10-30'], [['09:00', '13:00']])).toEqual([
            { date: '2026-10-12', intervals: [['09:00', '13:00']] },
            off('2026-10-20'),
            { date: '2026-10-30', intervals: [['09:00', '13:00']] },
        ]);
    });

    it('reemplaza la Anulación de una fecha que ya tenía', () => {
        expect(setOverrides([off('2026-10-12')], ['2026-10-12'], [['10:00', '12:00']])).toEqual([
            { date: '2026-10-12', intervals: [['10:00', '12:00']] },
        ]);
    });

    it('al editar, saca la fecha original aunque ya no esté elegida', () => {
        expect(setOverrides([off('2026-10-12'), off('2026-10-20')], ['2026-10-13'], [], '2026-10-12')).toEqual([
            off('2026-10-13'),
            off('2026-10-20'),
        ]);
    });
});
