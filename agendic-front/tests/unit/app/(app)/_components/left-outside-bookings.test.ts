import {
    commonCancellationReason,
    groupLeftOutsideByDay,
    savedToast,
    turnosCount,
} from '@/app/(app)/_components/left-outside-bookings';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

const booking = (id: number, startsAt: string, cancellationReason = 'Estoy Fuera de la oficina'): LeftOutsideBooking => ({
    id,
    startsAt,
    endsAt: startsAt,
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: null,
    branch: null,
    cancellationCause: 'OUT_OF_OFFICE',
    cancellationReason,
});

// 12 de octubre de 2026, 12:00 en Buenos Aires
const now = Date.parse('2026-10-12T15:00:00.000Z');

describe('groupLeftOutsideByDay', () => {
    it('groups by day in the Sucursal’s time, keeping the input order', () => {
        const bookings = [
            booking(1, '2026-10-12T13:00:00.000Z'),
            booking(2, '2026-10-12T20:00:00.000Z'),
            booking(3, '2026-10-13T13:00:00.000Z'),
        ];
        const days = groupLeftOutsideByDay(bookings, now);
        expect(days.map((d) => [d.key, d.label, d.bookings.map((b) => b.id)])).toEqual([
            ['2026-10-12', 'Hoy', [1, 2]],
            ['2026-10-13', 'Mañana', [3]],
        ]);
    });

    it('puts a late-night Turno on its local day, not the UTC one', () => {
        const [day] = groupLeftOutsideByDay([booking(1, '2026-10-13T01:30:00.000Z')], now);
        expect(day.key).toBe('2026-10-12');
    });

    it('lists each different reason of a day once', () => {
        const days = groupLeftOutsideByDay(
            [
                booking(1, '2026-10-12T13:00:00.000Z', 'A'),
                booking(2, '2026-10-12T14:00:00.000Z', 'A'),
                booking(3, '2026-10-12T15:00:00.000Z', 'B'),
                booking(4, '2026-10-13T13:00:00.000Z', 'B'),
            ],
            now,
        );
        expect(days.map((d) => d.reasons)).toEqual([['A', 'B'], ['B']]);
    });

    it('returns no days for no Turnos', () => {
        expect(groupLeftOutsideByDay([], now)).toEqual([]);
    });
});

describe('commonCancellationReason', () => {
    it('is the reason when every Turno has the same one', () => {
        expect(commonCancellationReason([booking(1, '2026-10-12T13:00:00.000Z', 'A'), booking(2, '2026-10-13T13:00:00.000Z', 'A')])).toBe('A');
    });

    it('is null when the reasons differ', () => {
        expect(commonCancellationReason([booking(1, '2026-10-12T13:00:00.000Z', 'A'), booking(2, '2026-10-13T13:00:00.000Z', 'B')])).toBeNull();
    });

    it('is null for no Turnos', () => {
        expect(commonCancellationReason([])).toBeNull();
    });
});

describe('turnosCount and savedToast', () => {
    it('uses the singular for one Turno', () => {
        expect(turnosCount(1)).toBe('1 Turno');
        expect(turnosCount(3)).toBe('3 Turnos');
    });

    it('adds the cancelled Turnos to the toast only when there are some', () => {
        expect(savedToast('Período creado', 0)).toBe('Período creado');
        expect(savedToast('Período creado', 1)).toBe('Período creado · 1 Turno cancelado');
        expect(savedToast('Período creado', 3)).toBe('Período creado · 3 Turnos cancelados');
    });
});
