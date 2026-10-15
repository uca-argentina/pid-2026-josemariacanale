import type { Booking } from '@/app/(app)/bookings/_components/booking-helpers';
import { addDays, bookingsOfWeek, toCalendarEvent, weekStartOf, weekTitle } from '@/app/(app)/bookings/_components/calendar-week';

const booking = (patch: Partial<Booking>): Booking =>
    ({
        id: 1,
        status: 'BOOKED',
        startsAt: '2026-10-14T10:00:00-03:00',
        endsAt: '2026-10-14T10:30:00-03:00',
        clientName: 'Lucía',
        serviceName: 'Masaje',
        business: { id: 3, name: 'Spa' },
        branch: { id: 4, name: 'Centro' },
        noShowAt: null,
        employeeNoShowAt: null,
        ...patch,
    }) as Booking;

describe('weekStartOf', () => {
    it('con lunes como primer día, el miércoles 14 de octubre de 2026 cae en la semana del 12', () => {
        expect(weekStartOf('2026-10-14', 1)).toBe('2026-10-12');
        expect(weekStartOf('2026-10-12', 1)).toBe('2026-10-12');
        expect(weekStartOf('2026-10-18', 1)).toBe('2026-10-12');
    });

    it('con domingo como primer día, la semana arranca el domingo', () => {
        expect(weekStartOf('2026-10-14', 0)).toBe('2026-10-11');
        expect(weekStartOf('2026-10-11', 0)).toBe('2026-10-11');
        expect(weekStartOf('2026-10-17', 0)).toBe('2026-10-11');
    });

    it('cruza el cambio de mes y de año', () => {
        expect(weekStartOf('2026-01-01', 1)).toBe('2025-12-29');
    });
});

describe('addDays', () => {
    it('suma y resta días cruzando el mes', () => {
        expect(addDays('2026-10-26', 7)).toBe('2026-11-02');
        expect(addDays('2026-10-12', -7)).toBe('2026-10-05');
    });
});

describe('bookingsOfWeek', () => {
    it('trae los Turnos aceptados y pendientes de la semana, sin los Cancelados ni los Rechazados', () => {
        const list = [
            booking({ id: 1 }),
            booking({ id: 2, status: 'PENDING' }),
            booking({ id: 3, status: 'CANCELLED' }),
            booking({ id: 4, status: 'REJECTED' }),
        ];
        expect(bookingsOfWeek(list, '2026-10-12').map((b) => b.id)).toEqual([1, 2]);
    });

    it('deja afuera lo de otras semanas y lee el día en la hora de la Sucursal', () => {
        const list = [
            booking({ id: 1, startsAt: '2026-10-11T23:30:00-03:00', endsAt: '2026-10-12T00:00:00-03:00' }),
            booking({ id: 2, startsAt: '2026-10-12T00:00:00-03:00', endsAt: '2026-10-12T00:30:00-03:00' }),
            booking({ id: 3, startsAt: '2026-10-18T23:30:00-03:00', endsAt: '2026-10-19T00:00:00-03:00' }),
            booking({ id: 4, startsAt: '2026-10-19T00:00:00-03:00', endsAt: '2026-10-19T00:30:00-03:00' }),
        ];
        expect(bookingsOfWeek(list, '2026-10-12').map((b) => b.id)).toEqual([2, 3]);
    });
});

describe('weekTitle', () => {
    it.each([
        ['2026-10-12', '12 – 18 oct 2026'],
        ['2026-09-28', '28 sep – 4 oct 2026'],
        ['2026-12-28', '28 dic 2026 – 3 ene 2027'],
    ])('%s → %s', (start, title) => {
        expect(weekTitle(start)).toBe(title);
    });
});

describe('toCalendarEvent', () => {
    it('lleva el estado, el Cliente y el lugar', () => {
        const event = toCalendarEvent(booking({ status: 'PENDING' }));
        expect(event).toMatchObject({ id: 1, title: 'Masaje con Lucía', description: 'Spa · Centro', options: { status: 'PENDING' } });
        expect(event.start).toEqual(new Date('2026-10-14T10:00:00-03:00'));
        expect(event.end).toEqual(new Date('2026-10-14T10:30:00-03:00'));
    });

    it('marca con ↻ un Turno de una Serie', () => {
        expect(toCalendarEvent(booking({ seriesId: 's1' })).title).toBe('↻ Masaje con Lucía');
    });

    it('marca la Ausencia del Invitado y la del Anfitrión', () => {
        expect(toCalendarEvent(booking({ noShowAt: '2026-10-14T11:00:00Z' })).title).toBe('Masaje con Lucía · Ausencia del Invitado');
        expect(toCalendarEvent(booking({ employeeNoShowAt: '2026-10-14T11:00:00Z' })).title).toBe('Masaje con Lucía · Ausencia del Anfitrión');
    });
});
