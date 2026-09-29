import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { SlotsRepository } from '@/src/infrastructure/repositories/slots.repository';

const serviceId = 1;
const employeeId = 2;
const from = '2026-10-05';
const to = '2026-10-07';

const mockSlots = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        { date: '2026-10-05', slots: ['2026-10-05T12:00:00.000Z'] },
        { date: '2026-10-06', slots: [], reason: 'NOT_WORKING' as const },
        { date: '2026-10-07', slots: [], reason: 'FULLY_BOOKED' as const },
    ],
};

const repo = () => new SlotsRepository('http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('SlotsRepository.getSlots', () => {
    it('returns service slots on 200', async () => {
        const fetchSpy = respond(200, mockSlots);

        const result = await repo().getSlots(serviceId, employeeId, from, to);

        expect(result).toEqual(mockSlots);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/1/slots?employeeId=2&from=2026-10-05&to=2026-10-07',
        );
    });

    it('translates 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Servicio no encontrado' });

        await expect(repo().getSlots(serviceId, employeeId, from, to)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates 500 to ApiRequestError with status 500', async () => {
        respond(500, { statusCode: 500, message: 'Internal Server Error' });

        const error = await repo().getSlots(serviceId, employeeId, from, to).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(500);
    });

    it('translates invalid JSON to ApiRequestError', async () => {
        respond(200, 'invalid json{');

        const error = await repo().getSlots(serviceId, employeeId, from, to).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
    });

    it('translates unexpected body shape to ApiRequestError', async () => {
        respond(200, { invalid: 'shape' });

        const error = await repo().getSlots(serviceId, employeeId, from, to).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
    });

    it('translates network failure to ApiRequestError without status', async () => {
        const cause = new TypeError('Failed to fetch');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);

        const error = await repo().getSlots(serviceId, employeeId, from, to).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });
});
