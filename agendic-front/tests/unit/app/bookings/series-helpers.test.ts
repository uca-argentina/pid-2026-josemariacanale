import type { Booking } from '@/app/(app)/bookings/_components/booking-helpers';
import { collapsePendingSeries, hasFollowingInSeries, seriesFrequency, seriesMatesOf, seriesRowsOf } from '@/app/(app)/bookings/_components/series-helpers';

const NOW = Date.parse('2026-09-15T15:00:00-03:00');

const booking = (patch: Partial<Booking>): Booking => ({
    id: 1,
    status: 'BOOKED',
    startsAt: '2026-09-15T18:00:00-03:00',
    endsAt: '2026-09-15T18:30:00-03:00',
    clientName: 'Lucía Bermúdez',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    employeeNoShowAt: null,
    serviceId: 2,
    employeeId: 5,
    employeeChosen: false,
    depositAmount: null,
    depositPaidAt: null,
    serviceName: 'Masaje',
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
    cabin: null,
    fromRescheduleId: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationCause: null,
    seriesId: null,
    ...patch,
});

/** Un Turno de la Serie `s1` el martes `day` de septiembre/octubre de 2026 a las 10:00. */
const inSeries = (id: number, startsAt: string, patch: Partial<Booking> = {}) =>
    booking({ id, seriesId: 's1', startsAt, endsAt: startsAt.replace('T10:00', 'T10:30'), ...patch });

describe('seriesFrequency', () => {
    it('dice "todos los martes" en una Serie semanal', () => {
        const series = [inSeries(1, '2026-09-15T10:00:00-03:00'), inSeries(2, '2026-09-22T10:00:00-03:00')];
        expect(seriesFrequency(series)).toBe('todos los martes 10:00');
    });

    it('dice "cada 2 semanas" en una Serie quincenal', () => {
        const series = [inSeries(1, '2026-09-15T10:00:00-03:00'), inSeries(2, '2026-09-29T10:00:00-03:00')];
        expect(seriesFrequency(series)).toBe('cada 2 semanas, martes 10:00');
    });

    it('toma el salto más corto: una fecha salteada no la vuelve quincenal', () => {
        const series = [inSeries(1, '2026-09-15T10:00:00-03:00'), inSeries(2, '2026-09-29T10:00:00-03:00'), inSeries(3, '2026-10-06T10:00:00-03:00')];
        expect(seriesFrequency(series)).toBe('todos los martes 10:00');
    });

    it('lee la frecuencia y el horario de los Turnos vigentes: uno cancelado no la cambia', () => {
        const series = [
            inSeries(1, '2026-09-14T10:00:00-03:00', { status: 'CANCELLED' }),
            inSeries(2, '2026-09-15T10:00:00-03:00'),
            inSeries(3, '2026-09-29T10:00:00-03:00'),
        ];
        expect(seriesFrequency(series)).toBe('cada 2 semanas, martes 10:00');
    });

    it('pone en plural sábado y domingo', () => {
        const series = [inSeries(1, '2026-09-19T10:00:00-03:00'), inSeries(2, '2026-09-26T10:00:00-03:00')];
        expect(seriesFrequency(series)).toBe('todos los sábados 10:00');
    });

    it('sigue el formato de hora de las Preferencias', () => {
        const series = [inSeries(1, '2026-09-15T15:00:00-03:00'), inSeries(2, '2026-09-22T15:00:00-03:00')];
        expect(seriesFrequency(series, 12)).toBe('todos los martes 3:00 p. m.');
    });
});

describe('seriesRowsOf', () => {
    it('arma una fila por Serie con Turnos por venir, con el próximo y "quedan N de M"', () => {
        const rows = seriesRowsOf(
            [
                inSeries(1, '2026-09-08T10:00:00-03:00'),
                inSeries(2, '2026-09-22T10:00:00-03:00'),
                inSeries(3, '2026-09-29T10:00:00-03:00', { status: 'CANCELLED' }),
                inSeries(4, '2026-10-06T10:00:00-03:00', { status: 'PENDING' }),
                booking({ id: 9 }),
            ],
            NOW,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ seriesId: 's1', remaining: 2, total: 4, pending: 1 });
        expect(rows[0].next.id).toBe(2);
        expect(rows[0].firstBooked?.id).toBe(2);
        expect(rows[0].firstPending?.id).toBe(4);
    });

    it('deja afuera una Serie que ya no tiene Turnos por venir', () => {
        expect(seriesRowsOf([inSeries(1, '2026-09-08T10:00:00-03:00'), inSeries(2, '2026-09-22T10:00:00-03:00', { status: 'CANCELLED' })], NOW)).toEqual([]);
    });

    it('ordena las Series por su próximo Turno', () => {
        const rows = seriesRowsOf(
            [
                booking({ id: 1, seriesId: 'late', startsAt: '2026-10-01T10:00:00-03:00', endsAt: '2026-10-01T10:30:00-03:00' }),
                booking({ id: 2, seriesId: 'soon', startsAt: '2026-09-20T10:00:00-03:00', endsAt: '2026-09-20T10:30:00-03:00' }),
            ],
            NOW,
        );
        expect(rows.map((r) => r.seriesId)).toEqual(['soon', 'late']);
    });
});

describe('collapsePendingSeries', () => {
    it('deja una sola vez cada Serie, en su primer Turno pendiente, con los pendientes por venir de toda la Serie', () => {
        const list = [
            inSeries(1, '2026-09-22T10:00:00-03:00', { status: 'PENDING' }),
            booking({ id: 9, status: 'PENDING' }),
            inSeries(2, '2026-09-29T10:00:00-03:00', { status: 'PENDING' }),
        ];
        // El tercero queda fuera de los filtros, pero Aceptar la Serie también lo acepta.
        const all = [...list, inSeries(3, '2026-10-06T10:00:00-03:00', { status: 'PENDING' }), inSeries(4, '2026-09-08T10:00:00-03:00', { status: 'PENDING' })];
        expect(collapsePendingSeries(list, all, NOW).map(({ booking: b, seriesPending }) => [b.id, seriesPending])).toEqual([
            [1, 3],
            [9, null],
        ]);
    });

    it('una Serie con un solo pendiente por venir queda como un Turno suelto', () => {
        const list = [inSeries(1, '2026-09-22T10:00:00-03:00', { status: 'PENDING' })];
        expect(collapsePendingSeries(list, list, NOW)).toEqual([{ booking: list[0], seriesPending: null }]);
    });
});

describe('seriesMatesOf', () => {
    it('da los demás Turnos de la Serie, por fecha', () => {
        const all = [inSeries(3, '2026-09-29T10:00:00-03:00'), inSeries(1, '2026-09-15T10:00:00-03:00'), inSeries(2, '2026-09-22T10:00:00-03:00'), booking({ id: 9 })];
        expect(seriesMatesOf(all, all[2]).map((b) => b.id)).toEqual([1, 3]);
    });

    it('un Turno suelto no tiene Serie', () => {
        expect(seriesMatesOf([booking({})], booking({}))).toEqual([]);
    });
});

describe('hasFollowingInSeries', () => {
    it('es true si después vienen Turnos pendientes o aceptados de la Serie', () => {
        const all = [inSeries(1, '2026-09-22T10:00:00-03:00'), inSeries(2, '2026-09-29T10:00:00-03:00', { status: 'PENDING' })];
        expect(hasFollowingInSeries(all, all[0])).toBe(true);
    });

    it('es false en el último, si los siguientes están cancelados, o en un Turno suelto', () => {
        const all = [inSeries(1, '2026-09-22T10:00:00-03:00'), inSeries(2, '2026-09-29T10:00:00-03:00', { status: 'CANCELLED' })];
        expect(hasFollowingInSeries(all, all[0])).toBe(false);
        expect(hasFollowingInSeries(all, all[1])).toBe(false);
        expect(hasFollowingInSeries([booking({})], booking({}))).toBe(false);
    });
});
