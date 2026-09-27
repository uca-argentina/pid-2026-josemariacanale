import { formatTime, groupByDay, matches, mockBookings, sortForTab, tabOf, type Booking } from '@/app/(app)/_components/mock-bookings';

const NOW = Date.parse('2026-09-15T15:00:00-03:00');

const booking = (patch: Partial<Booking>): Booking => ({
    id: 'x',
    startsAt: '2026-09-15T18:00:00-03:00',
    endsAt: '2026-09-15T18:30:00-03:00',
    service: 'Masaje',
    clientName: 'Lucía Bermúdez',
    clientEmail: 'lucia@gmail.com',
    employee: 'Martina',
    branch: 'Centro',
    status: 'booked',
    ...patch,
});

describe('tabOf', () => {
    it('separa próximos, pendientes, pasados y cancelados', () => {
        expect(tabOf(booking({}), NOW)).toBe('upcoming');
        expect(tabOf(booking({ status: 'pending' }), NOW)).toBe('pending');
        expect(tabOf(booking({ startsAt: '2026-09-15T10:00:00-03:00', endsAt: '2026-09-15T10:30:00-03:00' }), NOW)).toBe('past');
        expect(tabOf(booking({ status: 'rejected' }), NOW)).toBe('cancelled');
    });

    it('un turno en curso sigue siendo próximo hasta que termina', () => {
        expect(tabOf(booking({ startsAt: '2026-09-15T14:45:00-03:00', endsAt: '2026-09-15T15:15:00-03:00' }), NOW)).toBe('upcoming');
    });
});

describe('sortForTab + groupByDay', () => {
    it('agrupa por día en la hora de la Sucursal, en el orden de la pestaña', () => {
        const late = booking({ id: 'late', startsAt: '2026-09-16T23:30:00-03:00' });
        const today = booking({ id: 'today' });
        const groups = groupByDay(sortForTab('upcoming', [late, today]), NOW);
        expect(groups.map((g) => [g.label, g.items.map((b) => b.id)])).toEqual([
            ['Hoy', ['today']],
            ['Mañana', ['late']],
        ]);
    });
});

describe('matches', () => {
    it('combina filtros y los vacíos no filtran', () => {
        const b = booking({});
        expect(matches(b, [{ field: 'branch', values: [] }, { field: 'clientName', op: 'is', value: ' ' }])).toBe(true);
        expect(matches(b, [{ field: 'branch', values: ['Palermo'] }])).toBe(false);
        expect(matches(b, [{ field: 'clientName', op: 'is', value: 'lucía bermúdez' }])).toBe(true);
        expect(matches(b, [{ field: 'clientName', op: 'is', value: 'lucía' }])).toBe(false);
        expect(matches(b, [{ field: 'clientEmail', op: 'contains', value: 'GMAIL' }])).toBe(true);
    });
});

describe('formatTime', () => {
    // Alimenta un <input type="time">: medianoche tiene que ser 00:00, no 24:00.
    it('usa horas 00–23', () => {
        expect(formatTime('2026-09-16T00:05:00-03:00')).toBe('00:05');
    });
});

describe('mockBookings', () => {
    it('arma los turnos alrededor de `now`, así siempre hay próximos y pasados', () => {
        const tabs = new Set(mockBookings(NOW).map((b) => tabOf(b, NOW)));
        expect(tabs).toEqual(new Set(['upcoming', 'pending', 'past', 'cancelled']));
    });
});
