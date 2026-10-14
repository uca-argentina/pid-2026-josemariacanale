import { formatTime, formatTimeRange, placeOf } from '@/app/(app)/_components/booking-format';

const booking = (patch: Partial<{ startsAt: string; endsAt: string; employeeId: number | null; business: { id: number; name: string } | null; branch: { id: number; name: string } | null }>) => ({
    startsAt: '2026-09-15T18:00:00-03:00',
    endsAt: '2026-09-15T18:30:00-03:00',
    employeeId: 5,
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
    ...patch,
});

describe('placeOf', () => {
    it('acepta un objeto reducido, solo con business y branch', () => {
        expect(placeOf({ business: { name: 'Spa' }, branch: { name: 'Centro' } })).toBe('Spa · Centro');
        expect(placeOf({ business: null, branch: null })).toBe('Servicio personal');
    });

    it('muestra Negocio y Sucursal, o Servicio personal si el Turno no tiene Negocio', () => {
        expect(placeOf(booking({}))).toBe('Spa · Centro');
        expect(placeOf(booking({ employeeId: null, business: null, branch: null }))).toBe('Servicio personal');
    });
});

describe('formatTime / formatTimeRange', () => {
    const at = '2026-09-15T14:30:00-03:00';

    it('con timeFormat 24 da "14:30"; con 12, "2:30 p. m."', () => {
        expect(formatTime(at, 24)).toBe('14:30');
        expect(formatTime(at, 12)).toBe('2:30 p. m.');
        expect(formatTime('2026-09-15T00:05:00-03:00', 12)).toBe('12:05 a. m.');
    });

    it('sin timeFormat usa 24 horas', () => {
        expect(formatTimeRange(booking({ startsAt: at, endsAt: '2026-09-15T15:00:00-03:00' }))).toBe('14:30 – 15:00');
        expect(formatTimeRange(booking({ startsAt: at, endsAt: '2026-09-15T15:00:00-03:00' }), 12)).toBe('2:30 p. m. – 3:00 p. m.');
    });
});
