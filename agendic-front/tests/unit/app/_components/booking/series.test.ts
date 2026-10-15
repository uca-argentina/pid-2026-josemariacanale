import { countOptions, everyWeeksLabel, mergeConflicts, seriesDatesView, skippedDates, stepsFor } from '@/app/_components/booking/series';

const dates = [
    { date: '2026-09-28', startsAt: '2026-09-28T12:00:00.000Z', available: true },
    { date: '2026-10-05', startsAt: '2026-10-05T12:00:00.000Z', available: false },
    { date: '2026-10-12', startsAt: '2026-10-12T12:00:00.000Z', available: true },
];

describe('stepsFor', () => {
    it('suma el paso Fechas antes de Confirmar solo cuando se Reserva una Serie', () => {
        expect(stepsFor(null)).toEqual(['service', 'time', 'confirm']);
        expect(stepsFor(3)).toEqual(['service', 'time', 'dates', 'confirm']);
    });
});

describe('countOptions', () => {
    it('ofrece de 2 Turnos al máximo de la Repetición', () => {
        expect(countOptions(4)).toEqual([2, 3, 4]);
    });
});

describe('seriesDatesView', () => {
    it('marca como no disponibles las que el back marcó', () => {
        expect(seriesDatesView(dates, []).map((d) => d.available)).toEqual([true, false, true]);
    });

    it('marca también las fechas del 409, aunque el back las haya dado como disponibles', () => {
        expect(seriesDatesView(dates, ['2026-10-12']).map((d) => d.available)).toEqual([true, false, false]);
    });
});

describe('skippedDates', () => {
    it('son las no disponibles: nunca se saltea una fecha que no se mostró', () => {
        expect(skippedDates(seriesDatesView(dates, ['2026-10-12']))).toEqual({ skip: ['2026-10-05', '2026-10-12'], remaining: 1 });
    });

    it('sin choques no saltea ninguna', () => {
        expect(skippedDates(seriesDatesView(dates.map((d) => ({ ...d, available: true })), []))).toEqual({ skip: [], remaining: 3 });
    });
});

describe('mergeConflicts', () => {
    it('suma las fechas de un segundo 409 a las del primero: el reintento las sigue salteando a todas', () => {
        expect(mergeConflicts(['2026-10-05'], ['2026-10-12'])).toEqual(['2026-10-05', '2026-10-12']);
    });

    it('no repite una fecha que ya estaba', () => {
        expect(mergeConflicts(['2026-10-05'], ['2026-10-05', '2026-10-12'])).toEqual(['2026-10-05', '2026-10-12']);
    });
});

describe('everyWeeksLabel', () => {
    it('dice "todas las semanas" cada 1 semana', () => {
        expect(everyWeeksLabel(1)).toBe('todas las semanas');
    });

    it('dice cada cuántas semanas si son más', () => {
        expect(everyWeeksLabel(2)).toBe('cada 2 semanas');
    });
});
