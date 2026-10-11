import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';
import { OutOfOfficeRepository } from '@/src/infrastructure/repositories/out-of-office.repository';
import { authWith } from '@/tests/unit/stubs';

const periodo = { id: 1, startDate: '2026-10-11', endDate: '2026-10-16', reason: 'VACATION', notes: null, showNotePublicly: false };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new OutOfOfficeRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
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
