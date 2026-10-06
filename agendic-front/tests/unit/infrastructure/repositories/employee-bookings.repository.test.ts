import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { BookingNotAllowedError, BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { EmployeeBookingsRepository } from '@/src/infrastructure/repositories/employee-bookings.repository';
import { authWith } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    status: 'BOOKED',
    startsAt: '2026-10-01T15:00:00.000Z',
    endsAt: '2026-10-01T15:45:00.000Z',
    clientName: 'Lucía',
    clientEmail: 'lucia@gmail.com',
    noShowAt: null,
    serviceId: 2,
    serviceName: 'Masaje',
    businessId: 3,
    businessName: 'Spa',
    branchId: 4,
    branchName: 'Centro',
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new EmployeeBookingsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('EmployeeBookingsRepository.listMyBookings', () => {
    it('GETs the Turnos with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [booking]);

        await expect(repo().listMyBookings()).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/me/bookings',
            expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
        );
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

describe('EmployeeBookingsRepository actions', () => {
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

    it('reschedule PATCHes /bookings/:id/reschedule with the chosen startsAt', async () => {
        const fetchSpy = respond(200, {});
        await repo().reschedule(7, '2026-10-02T15:00:00.000Z');
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
