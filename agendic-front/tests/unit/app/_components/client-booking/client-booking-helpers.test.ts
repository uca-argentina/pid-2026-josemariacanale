import { canPayDeposit, hasPendingDeposit } from '@/app/_components/client-booking/client-booking-helpers';
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
