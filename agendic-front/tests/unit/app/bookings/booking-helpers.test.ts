import { actionsOf, badgesOf, cancellationOf, neighboursOf, statusBadgesOf, cabinOf, canMarkNoShow, groupByDay, hasPendingDeposit, matches, matchesRange, sortForTab, tabOf, type Booking } from '@/app/(app)/bookings/_components/booking-helpers';

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
    ...patch,
});

describe('cabinOf', () => {
    it('da el nombre de la Cabina, o null si el Turno no ocupa ninguna', () => {
        expect(cabinOf(booking({ cabin: { id: 6, name: 'Box 1' } }))).toBe('Box 1');
        expect(cabinOf(booking({}))).toBeNull();
    });
});

describe('cancellationOf', () => {
    it('un Turno que no está cancelado ni rechazado no tiene nada que mostrar', () => {
        expect(cancellationOf(booking({}))).toBeNull();
        expect(cancellationOf(booking({ status: 'CANCELLED' }))).toBeNull();
    });

    it('dice quién Canceló y el Motivo', () => {
        expect(cancellationOf(booking({ status: 'CANCELLED', cancelledBy: 'CLIENT', cancellationReason: 'No llego' }))).toEqual({
            by: 'el Cliente',
            reason: 'No llego',
            cause: null,
        });
        expect(cancellationOf(booking({ status: 'REJECTED', cancelledBy: 'EMPLOYEE' }))).toEqual({ by: 'el Empleado', reason: null, cause: null });
        expect(cancellationOf(booking({ status: 'CANCELLED', cancelledBy: 'RETIREMENT' }))?.by).toBe('una baja');
    });

    it.each([
        ['OUT_OF_OFFICE', 'Fuera de la oficina'],
        ['PUBLIC_HOLIDAY', 'Día festivo'],
        ['SCHEDULE_CHANGE', 'Cambio de horario'],
    ] as const)('la Causa %s se muestra como "%s"', (cause, label) => {
        const shown = cancellationOf(
            booking({ status: 'CANCELLED', cancelledBy: 'EMPLOYEE', cancellationReason: 'Estoy de viaje', cancellationCause: cause }),
        );
        expect(shown).toEqual({ by: 'el Empleado', reason: 'Estoy de viaje', cause: label });
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

describe('Ausencia del Anfitrión y del Invitado', () => {
    it('lleva el badge rojo "Ausencia del Anfitrión"', () => {
        expect(badgesOf(booking({ employeeNoShowAt: '2026-09-15T20:00:00.000Z' }))).toEqual([
            { label: 'Ausencia del Anfitrión', className: expect.stringContaining('#b91c1c') },
        ]);
    });

    it('lleva el badge rojo "Ausencia del Invitado"', () => {
        expect(badgesOf(booking({ noShowAt: '2026-09-15T20:00:00.000Z' }))).toEqual([
            { label: 'Ausencia del Invitado', className: expect.stringContaining('#b91c1c') },
        ]);
    });

    it('no ofrece Marcar Ausencia del Invitado con Ausencia del Anfitrión ni con Ausencia del Invitado', () => {
        expect(canMarkNoShow(booking({}))).toBe(true);
        expect(canMarkNoShow(booking({ employeeNoShowAt: '2026-09-15T20:00:00.000Z' }))).toBe(false);
        expect(canMarkNoShow(booking({ noShowAt: '2026-09-15T20:00:00.000Z' }))).toBe(false);
    });
});

describe('matchesRange', () => {
    const range = { from: '2026-09-15', to: '2026-09-16' };

    it('compara el día del startsAt en la hora de la Sucursal, con los extremos incluidos', () => {
        expect(matchesRange(booking({ startsAt: '2026-09-15T00:00:00-03:00' }), range)).toBe(true);
        expect(matchesRange(booking({ startsAt: '2026-09-16T23:59:00-03:00' }), range)).toBe(true);
        expect(matchesRange(booking({ startsAt: '2026-09-14T23:59:00-03:00' }), range)).toBe(false);
        expect(matchesRange(booking({ startsAt: '2026-09-17T00:00:00-03:00' }), range)).toBe(false);
        expect(matchesRange(booking({ startsAt: '2026-09-17T01:00:00Z' }), range)).toBe(true);
    });

    it('sin rango deja pasar todo', () => {
        expect(matchesRange(booking({}), null)).toBe(true);
    });
});


describe('actionsOf', () => {
    const PAST = Date.parse('2026-09-16T15:00:00-03:00');

    it('un Turno pendiente se acepta o se rechaza, y no tiene menú', () => {
        expect(actionsOf(booking({ status: 'PENDING' }), NOW)).toEqual({ main: ['accept', 'reject'], menu: [] });
    });

    it('un Turno aceptado y futuro se cancela o se reagenda desde el menú', () => {
        expect(actionsOf(booking({}), NOW)).toEqual({ main: [], menu: ['cancel', 'reschedule'] });
    });

    it('un Turno aceptado y pasado se marca con Ausencia, salvo que ya tenga una marca', () => {
        expect(actionsOf(booking({}), PAST)).toEqual({ main: [], menu: ['no-show'] });
        expect(actionsOf(booking({ noShowAt: '2026-09-15T20:00:00.000Z' }), PAST)).toEqual({ main: [], menu: [] });
        expect(actionsOf(booking({ employeeNoShowAt: '2026-09-15T20:00:00.000Z' }), PAST)).toEqual({ main: [], menu: [] });
    });

    it('un Turno cancelado o rechazado no tiene acciones', () => {
        expect(actionsOf(booking({ status: 'CANCELLED' }), NOW)).toEqual({ main: [], menu: [] });
        expect(actionsOf(booking({ status: 'REJECTED' }), NOW)).toEqual({ main: [], menu: [] });
    });
});

describe('neighboursOf', () => {
    const list = [booking({ id: 1 }), booking({ id: 2 }), booking({ id: 3 })];

    it('da el anterior y el siguiente en el orden de la lista', () => {
        expect(neighboursOf(list, 2)).toEqual({ previous: list[0], next: list[2] });
    });

    it('en los extremos falta uno de los dos', () => {
        expect(neighboursOf(list, 1)).toEqual({ previous: null, next: list[1] });
        expect(neighboursOf(list, 3)).toEqual({ previous: list[1], next: null });
    });

    it('un Turno que no está en la lista no tiene vecinos', () => {
        expect(neighboursOf(list, 9)).toEqual({ previous: null, next: null });
    });
});

describe('statusBadgesOf', () => {
    it('un Turno aceptado sin marcas es Aceptado', () => {
        expect(statusBadgesOf(booking({})).map((b) => b.label)).toEqual(['Aceptado']);
    });

    it('suma los badges de la lista a los del estado', () => {
        expect(statusBadgesOf(booking({ status: 'PENDING' })).map((b) => b.label)).toEqual(['Pendiente']);
        expect(statusBadgesOf(booking({ noShowAt: '2026-09-15T20:00:00.000Z', fromRescheduleId: 4 })).map((b) => b.label)).toEqual(['Ausencia del Invitado', 'Reagendado']);
    });
});
