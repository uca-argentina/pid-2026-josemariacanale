import { ApiRequestError } from '@/src/entities/errors/common';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { authWith } from '@/tests/unit/stubs';

const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: 'https://img/logo.png', ownerId: 7 };
const repo = () => new BusinessesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), 'http://api');
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BusinessesRepository Logo del Negocio', () => {
    it('PUTs the file as multipart with the bearer token and returns the Negocio', async () => {
        const fetchSpy = respond(200, business);
        const file = new File(['x'], 'logo.png', { type: 'image/png' });

        await expect(repo().uploadBusinessLogo(1, file)).resolves.toEqual(business);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe('http://api/businesses/1/logo');
        expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer tok' } });
        expect((init!.body as FormData).get('file')).toBeInstanceOf(File);
    });

    it.each([400, 403, 404, 413])('keeps an upload %i as ApiRequestError with its status', async (status) => {
        respond(status, { message: 'nope' });
        await expect(repo().uploadBusinessLogo(1, new File([], 'a.png'))).rejects.toMatchObject({ status });
    });

    it('fails with ApiRequestError when the body is not a Negocio', async () => {
        respond(200, { id: 1 });
        await expect(repo().uploadBusinessLogo(1, new File([], 'a.png'))).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('deletes with a 204', async () => {
        const fetchSpy = respond(204);

        await expect(repo().deleteBusinessLogo(1)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/businesses/1/logo', expect.objectContaining({ method: 'DELETE' }));
    });

    it('keeps a delete 403 as ApiRequestError', async () => {
        respond(403, { message: 'nope' });
        await expect(repo().deleteBusinessLogo(1)).rejects.toMatchObject({ status: 403 });
    });
});
