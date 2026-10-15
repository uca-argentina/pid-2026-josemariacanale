import { seriesConflictDates } from '@/src/infrastructure/repositories/series-conflict';

describe('seriesConflictDates', () => {
    it('reads the dates after the colon of the 409 of a Serie', () => {
        expect(seriesConflictDates('Series dates not available: 2026-10-20,2026-11-03')).toEqual(['2026-10-20', '2026-11-03']);
    });

    it('reads a single date', () => {
        expect(seriesConflictDates('Series dates not available: 2026-10-20')).toEqual(['2026-10-20']);
    });

    it('tolerates spaces after the commas', () => {
        expect(seriesConflictDates('Series dates not available: 2026-10-20, 2026-11-03')).toEqual(['2026-10-20', '2026-11-03']);
    });

    it('is null for any other 409, like a Turno tomado', () => {
        expect(seriesConflictDates('Overlaps a booked Turno for this Employee')).toBeNull();
    });

    it('is null when the dates are not YYYY-MM-DD', () => {
        expect(seriesConflictDates('Series dates not available: martes')).toBeNull();
    });
});
