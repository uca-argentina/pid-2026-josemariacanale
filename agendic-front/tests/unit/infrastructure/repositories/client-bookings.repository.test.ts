import { BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { ClientBookingsRepository } from '@/src/infrastructure/repositories/client-bookings.repository';
import { instrumentation } from '@/tests/unit/stubs';

const repo = (apiUrl: string | undefined = 'http://api') => new ClientBookingsRepository(instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

const booking = {
    id: 7,
    status: 'BOOKED',
    startsAt: '2026-10-10T12:00:00.000Z',
    endsAt: '2026-10-10T13:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    notes: null,
    clientName: 'Juana Pérez',
    serviceId: 100,
    employeeId: 1,
    service: { name: 'Corte', durationMinutes: 60, price: 5000, depositPercent: null },
    employeeName: 'Ana',
    business: { name: 'Peluquería Luna', slug: 'peluqueria-luna' },
    branch: { name: 'Centro', slug: 'centro', address: 'Av. Siempreviva 742', coverUrl: null },
    user: null,
};

describe('ClientBookingsRepository.getBookingByLink', () => {
    it('GETs el Enlace del Turno sin header de acceso, y devuelve el Turno', async () => {
        const fetchSpy = respond(200, booking);

        await expect(repo().getBookingByLink('s3cr3t-l1nk')).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/booking-links/s3cr3t-l1nk', { method: 'GET', headers: {} });
    });

    it('escapes the link in the path', async () => {
        const fetchSpy = respond(200, booking);
        await repo().getBookingByLink('a/b?c');
        expect(fetchSpy).toHaveBeenCalledWith('http://api/booking-links/a%2Fb%3Fc', expect.anything());
    });

    it('translates a 404 to NotFoundError, keeping the message', async () => {
        respond(404, { statusCode: 404, message: 'Turno not found' });
        const error = await repo().getBookingByLink('unknown').catch((e) => e);
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.message).toBe('Turno not found');
    });

    it('keeps the link out of the error message when the back responds without one', async () => {
        respond(500, {});
        const error = await repo().getBookingByLink('s3cr3t-l1nk').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.message).not.toContain('s3cr3t-l1nk');
    });
});

describe('ClientBookingsRepository.cancelBookingByLink', () => {
    it('PATCHes sin header de acceso ni body, y devuelve el Turno', async () => {
        const cancelled = { ...booking, status: 'CANCELLED' };
        const fetchSpy = respond(200, cancelled);

        await expect(repo().cancelBookingByLink('s3cr3t-l1nk')).resolves.toEqual(cancelled);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/booking-links/s3cr3t-l1nk/cancel', { method: 'PATCH', headers: {} });
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Turno not found' });
        await expect(repo().cancelBookingByLink('unknown')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 422 to BookingStateError, keeping the message', async () => {
        respond(422, { statusCode: 422, message: 'Turno 7 already started' });
        const error = await repo().cancelBookingByLink('s3cr3t-l1nk').catch((e) => e);
        expect(error).toBeInstanceOf(BookingStateError);
        expect(error.message).toBe('Turno 7 already started');
    });
});

describe('ClientBookingsRepository.rescheduleBookingByLink', () => {
    const startsAt = '2026-10-11T12:00:00.000Z';

    it('PATCHes startsAt sin header de acceso, y devuelve el Turno', async () => {
        const fetchSpy = respond(200, booking);

        await expect(repo().rescheduleBookingByLink('s3cr3t-l1nk', startsAt)).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/booking-links/s3cr3t-l1nk/reschedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startsAt }),
        });
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Turno not found' });
        await expect(repo().rescheduleBookingByLink('unknown', startsAt)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 409 to SlotTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Overlaps a booked Turno for this Employee' });
        await expect(repo().rescheduleBookingByLink('s3cr3t-l1nk', startsAt)).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('translates the 422 de horario no disponible a SlotUnavailableError', async () => {
        respond(422, { statusCode: 422, message: 'Slot 2026-10-11T12:00:00.000Z is not available for Service 100' });
        await expect(repo().rescheduleBookingByLink('s3cr3t-l1nk', startsAt)).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it('translates any other 422 to BookingStateError', async () => {
        respond(422, { statusCode: 422, message: 'Turno is not pending or booked' });
        await expect(repo().rescheduleBookingByLink('s3cr3t-l1nk', startsAt)).rejects.toBeInstanceOf(BookingStateError);
    });
});

describe('ClientBookingsRepository misc', () => {
    it('throws ApiRequestError without calling the back when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').getBookingByLink('s3cr3t-l1nk')).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().getBookingByLink('s3cr3t-l1nk').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('runs each method inside a span named after the repository and the method', async () => {
        const names: string[] = [];
        const spanning = new ClientBookingsRepository({ startSpan: (options, callback) => (names.push(options.name), callback()) }, 'http://api');
        respond(404, { message: 'nope' });
        await spanning.getBookingByLink('s3cr3t-l1nk').catch(() => undefined);
        await spanning.cancelBookingByLink('s3cr3t-l1nk').catch(() => undefined);
        await spanning.rescheduleBookingByLink('s3cr3t-l1nk', '2026-10-11T12:00:00.000Z').catch(() => undefined);
        expect(names).toEqual([
            'ClientBookingsRepository > getBookingByLink',
            'ClientBookingsRepository > cancelBookingByLink',
            'ClientBookingsRepository > rescheduleBookingByLink',
        ]);
    });
});
