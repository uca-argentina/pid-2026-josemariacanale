import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { BookingNotAllowedError, BookingStateError, CancellationReasonTooLongError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { PrizeAlreadyRedeemedError, PrizeExpiredError, PrizeOfAnotherClientError } from '@/src/entities/errors/streak';
import { UserBookingsRepository } from '@/src/infrastructure/repositories/user-bookings.repository';
import { authWith } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    status: 'BOOKED',
    startsAt: '2026-10-01T15:00:00.000Z',
    endsAt: '2026-10-01T15:45:00.000Z',
    clientName: 'Lucía',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    employeeNoShowAt: null,
    serviceId: 2,
    serviceName: 'Masaje',
    employeeId: 5,
    employeeChosen: false,
    depositAmount: 3600,
    depositPaidAt: null,
    business: { id: 3, name: 'Spa' },
    branch: { id: 4, name: 'Centro' },
    cabin: { id: 6, name: 'Box 1' },
    seriesId: null,
    fromRescheduleId: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationCause: null,
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new UserBookingsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('UserBookingsRepository.listMyBookings', () => {
    it('GETs the Turnos with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [booking]);

        await expect(repo().listMyBookings()).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/bookings',
            expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('parses a Turno of a Servicio personal, without Empleado, Negocio or Sucursal', async () => {
        const personal = { ...booking, employeeId: null, business: null, branch: null, cabin: null };
        respond(200, [personal]);
        await expect(repo().listMyBookings()).resolves.toEqual([personal]);
    });

    it('parses a Turno without Cabina, with cabin null', async () => {
        const withoutCabin = { ...booking, cabin: null };
        respond(200, [withoutCabin]);
        await expect(repo().listMyBookings()).resolves.toEqual([withoutCabin]);
    });

    it('rejects a Turno that comes without the cabin field', async () => {
        const { cabin: _cabin, ...withoutField } = booking;
        respond(200, [withoutField]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('parses the Causa de cancelación of a Turno cancelled by a schedule change', async () => {
        const caused = { ...booking, status: 'CANCELLED', cancelledBy: 'EMPLOYEE', cancellationReason: 'Vacaciones', cancellationCause: 'OUT_OF_OFFICE' };
        respond(200, [caused]);
        await expect(repo().listMyBookings()).resolves.toEqual([caused]);
    });

    it('rejects an unknown Causa de cancelación', async () => {
        respond(200, [{ ...booking, cancellationCause: 'OTHER' }]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('rejects a Turno that comes without the cancellationCause field', async () => {
        const { cancellationCause: _cause, ...withoutField } = booking;
        respond(200, [withoutField]);
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('returns an empty list as is', async () => {
        respond(200, []);
        await expect(repo().listMyBookings()).resolves.toEqual([]);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listMyBookings()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates the 422 of horario no disponible to SlotUnavailableError', async () => {
        respond(422, { message: 'Slot 2026-10-02T15:00:00.000Z is not available for Service 3' });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it('translates another status to ApiRequestError carrying it', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listMyBookings()).rejects.toMatchObject({ status: 500 });
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listMyBookings().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('translates a body that does not match the schema to ApiRequestError without status', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listMyBookings().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listMyBookings()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('UserBookingsRepository.getHistory', () => {
    const entries = [
        { type: 'booked', at: '2026-10-12T13:03:00.000Z', actor: 'client', reason: null, from: null },
        {
            type: 'rescheduled',
            at: '2026-10-13T13:00:00.000Z',
            actor: 'client',
            reason: null,
            from: { startsAt: '2026-10-14T13:00:00.000Z', endsAt: '2026-10-14T14:00:00.000Z' },
        },
    ];

    it('GETs /bookings/:id/history with the bearer token and returns its entries', async () => {
        const fetchSpy = respond(200, { entries });
        await expect(repo().getHistory(7)).resolves.toEqual(entries);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings/7/history', expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }));
    });

    it('rejects an entry of an unknown type', async () => {
        respond(200, { entries: [{ ...entries[0], type: 'archived' }] });
        await expect(repo().getHistory(7)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Booking not found' });
        await expect(repo().getHistory(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('UserBookingsRepository actions', () => {
    const actions = [
        ['accept', 'accept', () => repo().accept(7)],
        ['reject', 'reject', () => repo().reject(7)],
        ['cancel', 'cancel', () => repo().cancel(7)],
        ['markNoShow', 'no-show', () => repo().markNoShow(7)],
    ] as const;

    it.each(actions)('%s PATCHes /bookings/:id/%s with the bearer token and no body', async (_method, route, run) => {
        const fetchSpy = respond(200, {});
        await run();
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/bookings/7/${route}`,
            expect.objectContaining({ method: 'PATCH', headers: { Authorization: 'Bearer tok' }, body: undefined }),
        );
    });

    it.each([
        ['reject', () => repo().reject(7, 'Estoy de viaje')],
        ['cancel', () => repo().cancel(7, 'Estoy de viaje')],
    ] as const)('%s sends the Motivo de cancelación in the body', async (route, run) => {
        const fetchSpy = respond(200, {});
        await run();
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/bookings/7/${route}`,
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ reason: 'Estoy de viaje' }) }),
        );
    });

    it.each([
        ['accept', () => repo().accept(7, true), { series: true }],
        ['reject', () => repo().reject(7, 'Estoy de viaje', true), { reason: 'Estoy de viaje', series: true }],
        ['cancel', () => repo().cancel(7, undefined, true), { andFollowing: true }],
    ] as const)('%s sends the whole Serie in the body when asked', async (route, run, body) => {
        const fetchSpy = respond(200, {});
        await run();
        expect(fetchSpy).toHaveBeenCalledWith(`http://api/bookings/7/${route}`, expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }));
    });

    it.each([
        ['reject', () => repo().reject(7, 'x'.repeat(501))],
        ['cancel', () => repo().cancel(7, 'x'.repeat(501))],
    ] as const)('%s translates the 400 of a too long Motivo to CancellationReasonTooLongError', async (_route, run) => {
        respond(400, { statusCode: 400, message: 'reason is too long' });
        await expect(run()).rejects.toBeInstanceOf(CancellationReasonTooLongError);
    });

    it('keeps any other 400 as ApiRequestError', async () => {
        respond(400, { statusCode: 400, message: 'reason must be a string' });
        await expect(repo().cancel(7, 'x')).rejects.toMatchObject({ constructor: ApiRequestError, status: 400 });
    });

    it('unmarkNoShow DELETEs /bookings/:id/no-show with the bearer token and no body', async () => {
        const fetchSpy = respond(200, {});
        await repo().unmarkNoShow(7);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/bookings/7/no-show',
            expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer tok' }, body: undefined }),
        );
    });

    it('unmarkNoShow translates the 422 of a Turno without Ausencia del Invitado to BookingStateError', async () => {
        respond(422, { statusCode: 422, message: 'Turno has no Ausencia' });
        await expect(repo().unmarkNoShow(7)).rejects.toBeInstanceOf(BookingStateError);
    });

    it('reschedule PATCHes /bookings/:id/reschedule with the chosen startsAt', async () => {
        const fetchSpy = respond(200, { id: 9 });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).resolves.toEqual({ id: 9 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/bookings/7/reschedule',
            expect.objectContaining({
                method: 'PATCH',
                headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
                body: JSON.stringify({ startsAt: '2026-10-02T15:00:00.000Z' }),
            }),
        );
    });

    it.each([
        [401, UnauthenticatedError],
        [403, BookingNotAllowedError],
        [404, NotFoundError],
        [409, SlotTakenError],
        [422, BookingStateError],
    ])('translates a %i to its domain error', async (status, DomainError) => {
        respond(status, { message: 'no' });
        await expect(repo().reschedule(7, '2026-10-02T15:00:00.000Z')).rejects.toBeInstanceOf(DomainError);
    });

    it('translates another status to ApiRequestError carrying it', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().accept(7)).rejects.toMatchObject({ status: 500 });
    });
});

describe('UserBookingsRepository.getStreak', () => {
    const streak = {
        streak: { count: 2, burnsAt: '2026-10-13T15:00:00.000Z' },
        nextReward: {
            reward: { id: 7, requiredCount: 5, repeatable: false, type: 'GIFT', value: null, description: 'Un lavado', service: null, validForDays: null },
            remaining: 3,
        },
        prizes: [{ id: 3, type: 'GIFT', value: null, description: 'Un lavado', serviceName: null, grantedAt: '2026-10-01T12:00:00.000Z', expiresAt: null }],
    };

    it('GETs /bookings/:id/streak with the bearer token and parses it', async () => {
        const fetchSpy = respond(200, streak);

        await expect(repo().getStreak(7)).resolves.toEqual(streak);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/bookings/7/streak',
            expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('accepts the program off: no Racha, but Premios', async () => {
        const off = { streak: null, nextReward: null, prizes: streak.prizes };
        respond(200, off);

        await expect(repo().getStreak(7)).resolves.toEqual(off);
    });

    it('accepts a Racha that has not started: burnsAt null', async () => {
        respond(200, { ...streak, streak: { count: 0, burnsAt: null } });

        await expect(repo().getStreak(7)).resolves.toMatchObject({ streak: { count: 0, burnsAt: null } });
    });

    it('translates 403 to BookingNotAllowedError and 404 to NotFoundError', async () => {
        respond(403, { message: 'Only the assigned Employee can act on this Turno' });
        await expect(repo().getStreak(7)).rejects.toBeInstanceOf(BookingNotAllowedError);
        jest.restoreAllMocks();
        respond(404, { message: 'Booking not found' });
        await expect(repo().getStreak(7)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a body that is not a Racha', async () => {
        respond(200, { streak: 'yes' });

        await expect(repo().getStreak(7)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('UserBookingsRepository.redeemPrize', () => {
    const redeemed = {
        id: 3,
        type: 'GIFT',
        value: null,
        description: 'Un lavado',
        serviceName: null,
        grantedAt: '2026-10-01T12:00:00.000Z',
        expiresAt: null,
        redeemedAt: '2026-10-05T12:00:00.000Z',
    };

    it('PATCHes /bookings/:id/redeem-prize with the prizeId and parses the Premio', async () => {
        const fetchSpy = respond(200, redeemed);

        await expect(repo().redeemPrize(7, 3)).resolves.toEqual(redeemed);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/bookings/7/redeem-prize',
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ prizeId: 3 }) }),
        );
    });

    it('translates the 409 to PrizeAlreadyRedeemedError, not to a taken horario', async () => {
        respond(409, { message: 'Prize 3 already redeemed' });

        const error = await repo().redeemPrize(7, 3).catch((e) => e);

        expect(error).toBeInstanceOf(PrizeAlreadyRedeemedError);
        expect(error).not.toBeInstanceOf(SlotTakenError);
    });

    it('translates the two 422 of a Premio apart from the Turno one', async () => {
        respond(422, { message: 'Prize 3 expired' });
        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(PrizeExpiredError);
        jest.restoreAllMocks();
        respond(422, { message: 'Prize 3 belongs to another Ficha del Cliente' });
        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(PrizeOfAnotherClientError);
        jest.restoreAllMocks();
        respond(422, { message: 'Booking 7 is not accepted' });
        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(BookingStateError);
    });

    it('translates 403 and 404, and a 404 of the Premio', async () => {
        respond(403, { message: 'Only the assigned Employee can act on this Turno' });
        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(BookingNotAllowedError);
        jest.restoreAllMocks();
        respond(404, { message: 'Prize 3 not found' });
        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a body without the redeemedAt', async () => {
        respond(200, { ...redeemed, redeemedAt: undefined });

        await expect(repo().redeemPrize(7, 3)).rejects.toBeInstanceOf(ApiRequestError);
    });
});
