import { groupByDay, matches, placeOf, sortForTab, tabOf, type Booking } from '@/app/(app)/bookings/_components/booking-helpers';

const NOW = Date.parse('2026-09-15T15:00:00-03:00');

const booking = (patch: Partial<Booking>): Booking => ({
    id: 1,
    status: 'BOOKED',
    startsAt: '2026-09-15T18:00:00-03:00',
    endsAt: '2026-09-15T18:30:00-03:00',
    clientName: 'Lucía Bermúdez',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    serviceId: 2,
    employeeId: 5,
    serviceName: 'Masaje',
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
    ...patch,
});

describe('placeOf', () => {
    it('muestra Negocio y Sucursal, o Servicio personal si el Turno no tiene Negocio', () => {
        expect(placeOf(booking({}))).toBe('Spa · Centro');
        expect(placeOf(booking({ employeeId: null, business: null, branch: null }))).toBe('Servicio personal');
    });
});

describe('tabOf', () => {
    it('separa pendientes, próximos, pasados y cancelados según el estado real', () => {
        expect(tabOf(booking({}), NOW)).toBe('upcoming');
        expect(tabOf(booking({ status: 'PENDING' }), NOW)).toBe('pending');
        expect(tabOf(booking({ startsAt: '2026-09-15T10:00:00-03:00', endsAt: '2026-09-15T10:30:00-03:00' }), NOW)).toBe('past');
        expect(tabOf(booking({ status: 'REJECTED' }), NOW)).toBe('cancelled');
        expect(tabOf(booking({ status: 'CANCELLED' }), NOW)).toBe('cancelled');
    });

    it('un Turno pendiente sigue en Pendientes aunque su horario haya pasado', () => {
        expect(tabOf(booking({ status: 'PENDING', endsAt: '2026-09-15T10:30:00-03:00' }), NOW)).toBe('pending');
    });

    it('un turno en curso sigue siendo próximo hasta que termina', () => {
        expect(tabOf(booking({ startsAt: '2026-09-15T14:45:00-03:00', endsAt: '2026-09-15T15:15:00-03:00' }), NOW)).toBe('upcoming');
    });
});

describe('sortForTab + groupByDay', () => {
    it('agrupa por día en la hora de la Sucursal, en el orden de la pestaña', () => {
        const late = booking({ id: 2, startsAt: '2026-09-16T23:30:00-03:00' });
        const today = booking({ id: 1 });
        const groups = groupByDay(sortForTab('upcoming', [late, today]), NOW);
        expect(groups.map((g) => [g.label, g.items.map((b) => b.id)])).toEqual([
            ['Hoy', [1]],
            ['Mañana', [2]],
        ]);
    });
});

describe('matches', () => {
    it('combina filtros y los vacíos no filtran', () => {
        const b = booking({});
        expect(matches(b, [{ field: 'branch', values: [] }, { field: 'clientName', op: 'is', value: ' ' }])).toBe(true);
        expect(matches(b, [{ field: 'branch', values: ['Spa · Palermo'] }])).toBe(false);
        expect(matches(b, [{ field: 'branch', values: ['Spa · Centro'] }])).toBe(true);
        expect(matches(b, [{ field: 'service', values: ['Masaje'] }])).toBe(true);
        expect(matches(b, [{ field: 'clientName', op: 'is', value: 'lucía bermúdez' }])).toBe(true);
        expect(matches(b, [{ field: 'clientName', op: 'is', value: 'lucía' }])).toBe(false);
        expect(matches(b, [{ field: 'clientEmail', op: 'contains', value: 'GMAIL' }])).toBe(true);
    });
});
