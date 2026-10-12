import { badgesOf, cabinOf, canMarkNoShow, groupByDay, hasPendingDeposit, matches, placeOf, sortForTab, tabOf, type Booking } from '@/app/(app)/bookings/_components/booking-helpers';

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
    ...patch,
});

describe('placeOf', () => {
    it('muestra Negocio y Sucursal, o Servicio personal si el Turno no tiene Negocio', () => {
        expect(placeOf(booking({}))).toBe('Spa · Centro');
        expect(placeOf(booking({ employeeId: null, business: null, branch: null }))).toBe('Servicio personal');
    });
});

describe('cabinOf', () => {
    it('da el nombre de la Cabina, o null si el Turno no ocupa ninguna', () => {
        expect(cabinOf(booking({ cabin: { id: 6, name: 'Box 1' } }))).toBe('Box 1');
        expect(cabinOf(booking({}))).toBeNull();
    });
});

describe('hasPendingDeposit', () => {
    it('un Turno pendiente o aceptado con Seña sin pagar la tiene pendiente', () => {
        expect(hasPendingDeposit(booking({ status: 'BOOKED', depositAmount: 3600 }))).toBe(true);
        expect(hasPendingDeposit(booking({ status: 'PENDING', depositAmount: 3600 }))).toBe(true);
    });

    it('una Seña pagada o un Turno sin Seña no la tienen pendiente', () => {
        expect(hasPendingDeposit(booking({ depositAmount: 3600, depositPaidAt: '2026-09-14T12:00:00.000Z' }))).toBe(false);
        expect(hasPendingDeposit(booking({}))).toBe(false);
    });

    it('un Turno cancelado o rechazado no la tiene pendiente', () => {
        expect(hasPendingDeposit(booking({ status: 'CANCELLED', depositAmount: 3600 }))).toBe(false);
        expect(hasPendingDeposit(booking({ status: 'REJECTED', depositAmount: 3600 }))).toBe(false);
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

describe('badgesOf', () => {
    it('marca Reagendado cuando el Turno viene de un Reagendamiento', () => {
        expect(badgesOf(booking({ fromRescheduleId: 4 })).map((b) => b.label)).toEqual(['Reagendado']);
        expect(badgesOf(booking({})).map((b) => b.label)).toEqual([]);
    });
});

describe('Falta del Empleado', () => {
    it('lleva el badge rojo "Falta del Empleado"', () => {
        expect(badgesOf(booking({ employeeNoShowAt: '2026-09-15T20:00:00.000Z' }))).toEqual([
            { label: 'Falta del Empleado', className: expect.stringContaining('#b91c1c') },
        ]);
    });

    it('no ofrece Marcar ausencia con Falta del Empleado ni con Ausencia', () => {
        expect(canMarkNoShow(booking({}))).toBe(true);
        expect(canMarkNoShow(booking({ employeeNoShowAt: '2026-09-15T20:00:00.000Z' }))).toBe(false);
        expect(canMarkNoShow(booking({ noShowAt: '2026-09-15T20:00:00.000Z' }))).toBe(false);
    });
});
