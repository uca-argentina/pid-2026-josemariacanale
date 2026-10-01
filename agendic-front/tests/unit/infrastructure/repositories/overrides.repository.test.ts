import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { OverrideConflictError, OverrideRuleError } from '@/src/entities/errors/override';
import { OverridesRepository } from '@/src/infrastructure/repositories/overrides.repository';
import { authWith } from '@/tests/unit/stubs';

const hours = [{ startTime: '09:00', endTime: '12:00' }];

const repo = (apiUrl: string | undefined = 'http://api') =>
    new OverridesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('OverridesRepository.listOverrides', () => {
    it('GETs the Anulaciones of the Empleado with the bearer token and parses them', async () => {
        const body = [
            { date: '2026-12-24', intervals: [] },
            { date: '2026-12-31', intervals: hours },
        ];
        const fetchSpy = respond(200, body);

        await expect(repo().listOverrides(3)).resolves.toEqual(body);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/overrides',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Empleado inexistente' });
        await expect(repo().listOverrides(3)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listOverrides(3)).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'No sos el DueÃ±o' });
        await expect(repo().listOverrides(3)).rejects.toMatchObject({ status: 403 });
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listOverrides(3)).rejects.toMatchObject({ status: 500 });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().listOverrides(3)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError keeping the cause', async () => {
        const cause = new TypeError('fetch failed');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listOverrides(3).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBe(cause);
    });

    it('fails with ApiRequestError when API_URL is not set', async () => {
        await expect(repo('').listOverrides(3)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('OverridesRepository.setOverride', () => {
    const input = { employeeId: 3, date: '2026-12-24', intervals: hours, coveredByEmployeeId: 4 };

    it('PUTs the Franjas and the Cobertura to the date of the Empleado and parses the answer', async () => {
        const answer = { date: '2026-12-24', intervals: hours, coveredByEmployeeId: 4 };
        const fetchSpy = respond(200, answer);

        await expect(repo().setOverride(input)).resolves.toEqual(answer);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/overrides/2026-12-24',
            expect.objectContaining({
                method: 'PUT',
                headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
                body: JSON.stringify({ intervals: hours, coveredByEmployeeId: 4 }),
            }),
        );
    });

    it('accepts a dÃ­a libre without Cobertura', async () => {
        respond(200, { date: '2026-12-24', intervals: [], coveredByEmployeeId: null });
        await expect(repo().setOverride({ employeeId: 3, date: '2026-12-24', intervals: [] })).resolves.toMatchObject({ intervals: [] });
    });

    it('translates a 422 to OverrideRuleError with the message of the back', async () => {
        respond(422, { statusCode: 422, message: 'El compaÃ±ero no atiende los mismos Servicios' });
        const error = await repo().setOverride(input).catch((e) => e);
        expect(error).toBeInstanceOf(OverrideRuleError);
        expect(error.message).toBe('El compaÃ±ero no atiende los mismos Servicios');
    });

    it('translates a 409 to OverrideConflictError with the message of the back', async () => {
        respond(409, { statusCode: 409, message: 'Martina ya tiene un Turno a esa hora' });
        const error = await repo().setOverride(input).catch((e) => e);
        expect(error).toBeInstanceOf(OverrideConflictError);
        expect(error.message).toBe('Martina ya tiene un Turno a esa hora');
    });

    it('translates a 404 to NotFoundError and a 500 to ApiRequestError', async () => {
        respond(404, { message: 'no' });
        await expect(repo().setOverride(input)).rejects.toBeInstanceOf(NotFoundError);
        respond(500, { message: 'boom' });
        await expect(repo().setOverride(input)).rejects.toMatchObject({ status: 500 });
    });

    it('translates a body of another shape to ApiRequestError', async () => {
        respond(200, { date: 'maÃ±ana' });
        await expect(repo().setOverride(input)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('OverridesRepository.removeOverride', () => {
    it('DELETEs the date of the Empleado and resolves on a 204', async () => {
        const fetchSpy = respond(204);

        await expect(repo().removeOverride(3, '2026-12-24')).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/overrides/2026-12-24',
            expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('translates a 404 to NotFoundError and a 500 to ApiRequestError', async () => {
        respond(404, { message: 'no' });
        await expect(repo().removeOverride(3, '2026-12-24')).rejects.toBeInstanceOf(NotFoundError);
        respond(500, { message: 'boom' });
        await expect(repo().removeOverride(3, '2026-12-24')).rejects.toMatchObject({ status: 500 });
    });
});