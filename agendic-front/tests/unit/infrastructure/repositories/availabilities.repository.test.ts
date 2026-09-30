import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AvailabilityInUseError, AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { AvailabilitiesRepository } from '@/src/infrastructure/repositories/availabilities.repository';
import { authWith } from '@/tests/unit/stubs';

const availability = {
    id: 10,
    employeeId: 3,
    name: 'Horario',
    isDefault: false,
    intervals: [{ weekday: 1, startTime: '09:00', endTime: '13:00' }],
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new AvailabilitiesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('AvailabilitiesRepository.listAvailabilities', () => {
    it('GETs the Availability of the Empleado with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [availability]);

        await expect(repo().listAvailabilities(3)).resolves.toEqual([availability]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/availabilities',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Empleado inexistente' });
        await expect(repo().listAvailabilities(3)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listAvailabilities(3)).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'No sos el Dueño' });
        await expect(repo().listAvailabilities(3)).rejects.toMatchObject({ status: 403 });
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listAvailabilities(3)).rejects.toMatchObject({ status: 500 });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().listAvailabilities(3)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a body of another shape to ApiRequestError keeping the cause', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listAvailabilities(3).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listAvailabilities(3).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listAvailabilities(3)).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('AvailabilitiesRepository.createAvailability', () => {
    it('POSTs name and Franjas to the Empleado’s path and parses the 201', async () => {
        const fetchSpy = respond(201, availability);

        await expect(
            repo().createAvailability({ employeeId: 3, name: 'Horario', intervals: availability.intervals }),
        ).resolves.toEqual(availability);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/availabilities',
            expect.objectContaining({
                method: 'POST',
                headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Horario', intervals: availability.intervals }),
            }),
        );
    });

    it('translates a 422 to AvailabilityRuleError with the back’s message', async () => {
        respond(422, { statusCode: 422, message: 'Dos Franjas del mismo día se solapan' });
        await expect(repo().createAvailability({ employeeId: 3, name: 'H', intervals: [] })).rejects.toThrow(
            new AvailabilityRuleError('Dos Franjas del mismo día se solapan'),
        );
    });

    it('translates a 400 to ApiRequestError carrying the status', async () => {
        respond(400, { statusCode: 400, message: ['name must be a string'] });
        await expect(repo().createAvailability({ employeeId: 3, name: 'H', intervals: [] })).rejects.toMatchObject({ status: 400 });
    });
});

describe('AvailabilitiesRepository.updateAvailability', () => {
    it('PATCHes the changes without the id and parses the 200', async () => {
        const fetchSpy = respond(200, availability);

        await expect(repo().updateAvailability({ availabilityId: 10, name: 'Otro' })).resolves.toEqual(availability);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities/10',
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Otro' }) }),
        );
    });

    it('translates a 404 to NotFoundError and a 422 to AvailabilityRuleError', async () => {
        respond(404, { message: 'no existe' });
        await expect(repo().updateAvailability({ availabilityId: 10 })).rejects.toBeInstanceOf(NotFoundError);
        respond(422, { message: 'Cada Franja tiene que terminar después de empezar' });
        await expect(repo().updateAvailability({ availabilityId: 10 })).rejects.toBeInstanceOf(AvailabilityRuleError);
    });
});

describe('AvailabilitiesRepository.makeDefault', () => {
    it('POSTs to the default path without a body and parses the 200', async () => {
        const fetchSpy = respond(200, { ...availability, isDefault: true });

        await expect(repo().makeDefault(10)).resolves.toMatchObject({ isDefault: true });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/availabilities/10/default',
            expect.objectContaining({ method: 'POST', body: undefined, headers: { Authorization: 'Bearer tok' } }),
        );
    });
});

describe('AvailabilitiesRepository.deleteAvailability', () => {
    it('DELETEs and resolves on the 204', async () => {
        const fetchSpy = respond(204, undefined);

        await expect(repo().deleteAvailability(10)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/availabilities/10', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates a 422 (the default one) to AvailabilityRuleError', async () => {
        respond(422, { message: 'No se puede borrar la Availability predeterminada' });
        await expect(repo().deleteAvailability(10)).rejects.toThrow(
            new AvailabilityRuleError('No se puede borrar la Availability predeterminada'),
        );
    });

    it('translates a 409 (used by a Servicio) to AvailabilityInUseError with the count in the message', async () => {
        respond(409, { message: 'No se puede borrar la Availability: la usan 2 Servicios' });
        const error = await repo().deleteAvailability(10).catch((e) => e);
        expect(error).toBeInstanceOf(AvailabilityInUseError);
        expect(error.message).toBe('No se puede borrar la Availability: la usan 2 Servicios');
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { message: 'no existe' });
        await expect(repo().deleteAvailability(10)).rejects.toBeInstanceOf(NotFoundError);
    });
});
