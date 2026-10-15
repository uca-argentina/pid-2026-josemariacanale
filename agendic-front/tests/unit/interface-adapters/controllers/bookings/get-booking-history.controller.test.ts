import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import type { BookingHistoryEntry } from '@/src/entities/models/booking-history';
import { getBookingHistoryController } from '@/src/interface-adapters/controllers/bookings/get-booking-history.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const entry = (patch: Partial<BookingHistoryEntry>): BookingHistoryEntry => ({
    type: 'booked',
    at: '2026-10-12T13:03:00.000Z',
    actor: 'client',
    reason: null,
    from: null,
    ...patch,
});

const present = async (entries: BookingHistoryEntry[], timeFormat: 12 | 24 = 24) => {
    const useCase = jest.fn().mockResolvedValue(entries);
    return getBookingHistoryController(instrumentation, signedIn, useCase)({ bookingId: 7, timeZone: TIME_ZONE, timeFormat });
};

describe('getBookingHistoryController', () => {
    it('runs the use case with the id of the Turno', async () => {
        const useCase = jest.fn().mockResolvedValue([]);
        await getBookingHistoryController(instrumentation, signedIn, useCase)({ bookingId: 7, timeZone: TIME_ZONE, timeFormat: 24 });
        expect(useCase).toHaveBeenCalledWith(7);
    });

    it('dates each entry in the time zone it is given', async () => {
        await expect(present([entry({})])).resolves.toEqual([{ text: 'Reservado por el Cliente', at: '12 oct 10:03', reason: null }]);
    });

    it('uses the 12 h format when the Usuario prefers it', async () => {
        const [presented] = await present([entry({})], 12);
        expect(presented.at).toBe('12 oct 10:03 a. m.');
    });

    it.each([
        [entry({ type: 'booked', actor: 'client' }), 'Reservado por el Cliente'],
        [entry({ type: 'accepted', actor: 'employee' }), 'Aceptado por vos'],
        [entry({ type: 'rejected', actor: 'employee' }), 'Rechazado por vos'],
        [entry({ type: 'cancelled', actor: 'client' }), 'Cancelado por el Cliente'],
        [entry({ type: 'cancelled', actor: 'retirement' }), 'Cancelado por una baja'],
        [entry({ type: 'cancelled', actor: null }), 'Cancelado'],
        [entry({ type: 'noShow', actor: 'employee' }), 'Ausencia del Invitado marcada por vos'],
        [entry({ type: 'employeeNoShow', actor: 'client' }), 'Ausencia del Anfitrión marcada por el Cliente'],
        [entry({ type: 'depositPaid', actor: 'client' }), 'Seña pagada por el Cliente'],
        [entry({ type: 'rated', actor: 'client' }), 'Calificado por el Cliente'],
    ])('says what happened and who did it: %j', async (given, text) => {
        const [presented] = await present([given]);
        expect(presented.text).toBe(text);
    });

    it('says from which time a Turno was Reagendado', async () => {
        const [presented] = await present([
            entry({ type: 'rescheduled', actor: 'client', from: { startsAt: '2026-10-13T13:00:00.000Z', endsAt: '2026-10-13T14:00:00.000Z' } }),
        ]);
        expect(presented.text).toBe('Reagendado por el Cliente desde mar 13 oct 10:00');
    });

    it('keeps the Motivo de cancelación of an entry', async () => {
        const [presented] = await present([entry({ type: 'cancelled', actor: 'employee', reason: 'Estoy de viaje' })]);
        expect(presented).toMatchObject({ text: 'Cancelado por vos', reason: 'Estoy de viaje' });
    });

    it('keeps the order of the entries', async () => {
        const presented = await present([entry({ type: 'booked' }), entry({ type: 'accepted', actor: 'employee' })]);
        expect(presented.map((p) => p.text)).toEqual(['Reservado por el Cliente', 'Aceptado por vos']);
    });

    it.each([
        {},
        { bookingId: 0, timeZone: TIME_ZONE, timeFormat: 24 },
        { bookingId: 7, timeFormat: 24 },
        { bookingId: 7, timeZone: '', timeFormat: 24 },
        { bookingId: 7, timeZone: TIME_ZONE, timeFormat: 18 },
    ])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(getBookingHistoryController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(getBookingHistoryController(instrumentation, auth, useCase)({ bookingId: 7, timeZone: TIME_ZONE, timeFormat: 24 })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
