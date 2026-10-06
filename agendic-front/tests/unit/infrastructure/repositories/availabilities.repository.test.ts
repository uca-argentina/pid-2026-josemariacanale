import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { AvailabilitiesRepository } from '@/src/infrastructure/repositories/availabilities.repository';
import { authWith } from '@/tests/unit/stubs';

const summary = { id: 10, name: 'Horario', isDefault: false, timeZone: 'America/Argentina/Buenos_Aires' };
const schedule = [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []];
const detail = { ...summary, schedule, overrides: [{ date: '2026-12-25', ranges: [] }] };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new AvailabilitiesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('AvailabilitiesRepository.listAvailabilities', () => {
    it('GETs the Usuario’s Availability with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [summary]);

        await expect(repo().listAvailabilities()).resolves.toEqual([summary]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listAvailabilities()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listAvailabilities()).rejects.toMatchObject({ status: 500 });
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listAvailabilities().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listAvailabilities().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listAvailabilities()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('AvailabilitiesRepository.getAvailability', () => {
    it('GETs one Availability with its schedule and overrides', async () => {
        const fetchSpy = respond(200, detail);

        await expect(repo().getAvailability(10)).resolves.toEqual(detail);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/availabilities/10', expect.objectContaining({ method: 'GET' }));
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'no es tuya' });
        await expect(repo().getAvailability(10)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a schedule that does not have 7 days', async () => {
        respond(200, { ...detail, schedule: [[]] });
        await expect(repo().getAvailability(10)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('AvailabilitiesRepository.createAvailability', () => {
    it('POSTs name and time zone', async () => {
        const fetchSpy = respond(201, summary);

        await expect(repo().createAvailability({ name: 'Horario', timeZone: 'UTC' })).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities',
            expect.objectContaining({
                method: 'POST',
                headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Horario', timeZone: 'UTC' }),
            }),
        );
    });

    it('translates a 422 to AvailabilityRuleError with the back’s message', async () => {
        respond(422, { statusCode: 422, message: 'Zona horaria inválida: Marte/Olimpo' });
        await expect(repo().createAvailability({ name: 'H', timeZone: 'Marte/Olimpo' })).rejects.toThrow(
            new AvailabilityRuleError('Zona horaria inválida: Marte/Olimpo'),
        );
    });
});

describe('AvailabilitiesRepository.updateAvailability', () => {
    const body = { name: detail.name, timeZone: detail.timeZone, schedule: detail.schedule, overrides: detail.overrides };

    it('PUTs the whole body without the id', async () => {
        const fetchSpy = respond(200, detail);

        await repo().updateAvailability({ availabilityId: 10, ...body });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities/10',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }),
        );
    });

    it('translates a 404 to NotFoundError and a 422 to AvailabilityRuleError', async () => {
        respond(404, { message: 'no existe' });
        await expect(repo().updateAvailability({ availabilityId: 10, ...body })).rejects.toBeInstanceOf(NotFoundError);
        respond(422, { message: 'El miércoles tiene un rango que no termina después de empezar' });
        await expect(repo().updateAvailability({ availabilityId: 10, ...body })).rejects.toBeInstanceOf(AvailabilityRuleError);
    });
});

describe('AvailabilitiesRepository.makeDefault', () => {
    it('PATCHes the default path without a body', async () => {
        const fetchSpy = respond(200, undefined);

        await expect(repo().makeDefault(10)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities/10/default',
            expect.objectContaining({ method: 'PATCH', body: undefined, headers: { Authorization: 'Bearer tok' } }),
        );
    });
});

describe('AvailabilitiesRepository.deleteAvailability', () => {
    it('DELETEs and resolves on the 204', async () => {
        const fetchSpy = respond(204, undefined);

        await expect(repo().deleteAvailability(10)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/availabilities/10', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates a 422 (the default one, or in use by a Servicio) to AvailabilityRuleError', async () => {
        respond(422, { message: 'No se puede borrar la Availability predeterminada' });
        await expect(repo().deleteAvailability(10)).rejects.toThrow(
            new AvailabilityRuleError('No se puede borrar la Availability predeterminada'),
        );
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { message: 'no existe' });
        await expect(repo().deleteAvailability(10)).rejects.toBeInstanceOf(NotFoundError);
    });
});
