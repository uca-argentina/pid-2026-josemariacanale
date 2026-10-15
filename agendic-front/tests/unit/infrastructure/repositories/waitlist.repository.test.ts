import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { WaitlistDateInPastError, WaitlistDayNotFullError } from '@/src/entities/errors/waitlist';
import { WaitlistRepository } from '@/src/infrastructure/repositories/waitlist.repository';
import { instrumentation, waitlistEntryView } from '@/tests/unit/stubs';

const repo = (apiUrl: string | undefined = 'http://api') => new WaitlistRepository(instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

const input = { serviceId: 100, date: '2026-10-20', clientName: 'Juana Pérez', clientEmail: 'juana@example.com', code: 'ABC234' };

afterEach(() => jest.restoreAllMocks());

describe('WaitlistRepository.join', () => {
    it.each([201, 200])('POSTs the Anotación without a Sesión and returns it on a %i', async (status) => {
        const fetchSpy = respond(status, { serviceId: 100, date: '2026-10-20' });

        await expect(repo().join(input)).resolves.toEqual({ serviceId: 100, date: '2026-10-20' });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/services/100/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: '2026-10-20', clientName: 'Juana Pérez', clientEmail: 'juana@example.com', code: 'ABC234' }),
        });
    });

    it('translates the 400 of an invalid code to InvalidVerificationCodeError', async () => {
        respond(400, { statusCode: 400, message: 'Invalid or expired verification code for juana@example.com' });
        await expect(repo().join(input)).rejects.toBeInstanceOf(InvalidVerificationCodeError);
    });

    it('translates any other 400 to ApiRequestError carrying the status', async () => {
        respond(400, { statusCode: 400, message: 'date must be a valid date' });
        const error = await repo().join(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(400);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found or retired' });
        await expect(repo().join(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 409 to WaitlistDayNotFullError', async () => {
        respond(409, { statusCode: 409, message: 'Date 2026-10-20 is not fully booked for Service 100' });
        await expect(repo().join(input)).rejects.toBeInstanceOf(WaitlistDayNotFullError);
    });

    it('translates a 422 to WaitlistDateInPastError', async () => {
        respond(422, { statusCode: 422, message: 'Date 2026-10-20 is in the past' });
        await expect(repo().join(input)).rejects.toBeInstanceOf(WaitlistDateInPastError);
    });

    it('translates an unexpected body to ApiRequestError', async () => {
        respond(201, { ok: true });
        await expect(repo().join(input)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('fetch failed');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().join(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails with ApiRequestError when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').join(input)).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

const view = waitlistEntryView;

describe('WaitlistRepository.getByLink', () => {
    it('GETs the Anotación without a Sesión and returns it', async () => {
        const fetchSpy = respond(200, view);

        await expect(repo().getByLink('abc')).resolves.toEqual(view);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/waitlist-links/abc', { method: 'GET' });
    });

    it('accepts a Servicio personal, with business and branch null', async () => {
        const personal = { ...view, business: null, branch: null, user: { slug: 'juana' } };
        respond(200, personal);
        await expect(repo().getByLink('abc')).resolves.toEqual(personal);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Anotación not found' });
        await expect(repo().getByLink('abc')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        const error = await repo().getByLink('abc').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(500);
    });

    it('translates an unexpected body to ApiRequestError', async () => {
        respond(200, { ok: true });
        await expect(repo().getByLink('abc')).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError, keeping the cause', async () => {
        const cause = new TypeError('fetch failed');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().getByLink('abc').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBe(cause);
    });

    it('fails with ApiRequestError when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').getByLink('abc')).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('WaitlistRepository.leave', () => {
    it('POSTs the leave without a Sesión or body and resolves on a 204', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

        await expect(repo().leave('abc')).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/waitlist-links/abc/leave', { method: 'POST' });
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Anotación not found' });
        await expect(repo().leave('abc')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        const error = await repo().leave('abc').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(500);
    });
});
