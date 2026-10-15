import { canPayDeposit, cancellationReasonOf, hasPendingDeposit, ratingSection, seriesOf } from '@/app/_components/client-booking/client-booking-helpers';
import type { ClientBooking } from '@/app/_components/client-booking/types';

const NOW = Date.parse('2026-10-10T10:00:00.000Z');

const booking = (patch: Partial<ClientBooking>) =>
    ({
        status: 'BOOKED',
        startsAt: '2026-10-10T12:00:00.000Z',
        depositAmount: 1000,
        depositPaidAt: null,
        ...patch,
    }) as ClientBooking;

describe('hasPendingDeposit', () => {
    it('es la Seña que existe y todavía no se pagó', () => {
        expect(hasPendingDeposit(booking({}))).toBe(true);
        expect(hasPendingDeposit(booking({ depositPaidAt: '2026-10-09T12:00:00.000Z' }))).toBe(false);
        expect(hasPendingDeposit(booking({ depositAmount: null }))).toBe(false);
    });
});

describe('canPayDeposit', () => {
    it('ofrece Pagar seña con Seña pendiente en un Turno pendiente o aceptado que no empezó', () => {
        expect(canPayDeposit(booking({ status: 'BOOKED' }), NOW)).toBe(true);
        expect(canPayDeposit(booking({ status: 'PENDING' }), NOW)).toBe(true);
    });

    it('no la ofrece con la Seña pagada ni sin Seña', () => {
        expect(canPayDeposit(booking({ depositPaidAt: '2026-10-09T12:00:00.000Z' }), NOW)).toBe(false);
        expect(canPayDeposit(booking({ depositAmount: null }), NOW)).toBe(false);
    });

    it('no la ofrece en un Turno cancelado, rechazado o que ya empezó', () => {
        expect(canPayDeposit(booking({ status: 'CANCELLED' }), NOW)).toBe(false);
        expect(canPayDeposit(booking({ status: 'REJECTED' }), NOW)).toBe(false);
        expect(canPayDeposit(booking({ startsAt: '2026-10-10T09:00:00.000Z' }), NOW)).toBe(false);
    });
});

describe('ratingSection', () => {
    const rating = { score: 4, comment: null, createdAt: '2026-10-10T14:00:00.000Z' };

    it('muestra el formulario solo con canRate', () => {
        expect(ratingSection(booking({ canRate: true, rating: null }))).toBe('form');
        expect(ratingSection(booking({ canRate: false, rating: null }))).toBeNull();
    });

    it('muestra la Calificación en solo lectura cuando hay rating', () => {
        expect(ratingSection(booking({ canRate: false, rating }))).toBe('readonly');
    });
});

describe('cancellationReasonOf', () => {
    it('es el Motivo de un Turno Cancelado o Rechazado', () => {
        expect(cancellationReasonOf(booking({ status: 'CANCELLED', cancellationReason: 'Me surgió algo' }))).toBe('Me surgió algo');
        expect(cancellationReasonOf(booking({ status: 'REJECTED', cancellationReason: 'No atiendo ese día' }))).toBe('No atiendo ese día');
    });

    it('no hay Motivo que mostrar sin Motivo, ni en un Turno que sigue en pie', () => {
        expect(cancellationReasonOf(booking({ status: 'CANCELLED', cancellationReason: null }))).toBeNull();
        expect(cancellationReasonOf(booking({ status: 'BOOKED', cancellationReason: 'viejo' }))).toBeNull();
    });
});

describe('seriesOf', () => {
    const series = {
        bookings: [
            { startsAt: '2026-10-10T12:00:00.000Z', status: 'BOOKED' as const, link: 'l1nk-1' },
            { startsAt: '2026-10-17T12:00:00.000Z', status: 'CANCELLED' as const, link: 'l1nk-2' },
        ],
    };

    it('lista los Turnos de la Serie con su estado, marcando el que se está viendo', () => {
        expect(seriesOf(booking({ series }))).toEqual([
            { startsAt: '2026-10-10T12:00:00.000Z', status: 'Turno reservado', link: 'l1nk-1', current: true },
            { startsAt: '2026-10-17T12:00:00.000Z', status: 'Turno cancelado', link: 'l1nk-2', current: false },
        ]);
    });

    it('no hay Serie que mostrar en un Turno suelto', () => {
        expect(seriesOf(booking({ series: null }))).toBeNull();
    });
});
