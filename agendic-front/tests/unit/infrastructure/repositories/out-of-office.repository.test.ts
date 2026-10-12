import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import { OutOfOfficeRepository } from '@/src/infrastructure/repositories/out-of-office.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const periodo = { id: 1, startDate: '2026-10-11', endDate: '2026-10-16', reason: 'VACATION', notes: null, showNotePublicly: false };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new OutOfOfficeRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('OutOfOfficeRepository.listOutOfOffice', () => {
    it('GETs the Usuario’s períodos with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [periodo]);

        await expect(repo().listOutOfOffice()).resolves.toEqual([periodo]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('returns an empty list when there are none', async () => {
        respond(200, []);
        await expect(repo().listOutOfOffice()).resolves.toEqual([]);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listOutOfOffice()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listOutOfOffice()).rejects.toMatchObject({ status: 500 });
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listOutOfOffice().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listOutOfOffice().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listOutOfOffice()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('OutOfOfficeRepository writes', () => {
    const body = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION' as const, notes: 'Playa', showNotePublicly: true };

    it('POSTs the body', async () => {
        const fetchSpy = respond(201, periodo);
        await repo().createOutOfOffice(body);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office',
            expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
        );
    });

    it('PUTs the body to the período without the id in it', async () => {
        const fetchSpy = respond(200, periodo);
        await repo().updateOutOfOffice({ outOfOfficeId: 7, ...body });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office/7',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }),
        );
    });

    it('DELETEs the período', async () => {
        const fetchSpy = respond(204, undefined);
        await repo().deleteOutOfOffice(7);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/out-of-office/7', expect.objectContaining({ method: 'DELETE' }));
    });

    it.each([
        ['createOutOfOffice', (r: OutOfOfficeRepository) => r.createOutOfOffice(body)],
        ['updateOutOfOffice', (r: OutOfOfficeRepository) => r.updateOutOfOffice({ outOfOfficeId: 7, ...body })],
    ])('%s translates 422 and 409 keeping the back’s message', async (_name, run) => {
        respond(422, { message: 'La fecha de fin no puede ser anterior a la de inicio' });
        await expect(run(repo())).rejects.toEqual(new OutOfOfficeRuleError('La fecha de fin no puede ser anterior a la de inicio'));
        jest.restoreAllMocks();
        respond(409, { message: 'Ya hay un período Fuera de la oficina con esas fechas' });
        await expect(run(repo())).rejects.toBeInstanceOf(OutOfOfficeConflictError);
    });

    it.each([
        ['updateOutOfOffice', (r: OutOfOfficeRepository) => r.updateOutOfOffice({ outOfOfficeId: 7, ...body })],
        ['deleteOutOfOffice', (r: OutOfOfficeRepository) => r.deleteOutOfOffice(7)],
    ])('%s translates 404 to NotFoundError', async (_name, run) => {
        respond(404, { message: 'Out of office 7 not found' });
        await expect(run(repo())).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 401 to UnauthenticatedError and a 500 to ApiRequestError with its status', async () => {
        respond(401, { message: 'no' });
        await expect(repo().deleteOutOfOffice(7)).rejects.toBeInstanceOf(UnauthenticatedError);
        jest.restoreAllMocks();
        respond(500, { message: 'boom' });
        await expect(repo().createOutOfOffice(body)).rejects.toMatchObject({ status: 500 });
    });
});
