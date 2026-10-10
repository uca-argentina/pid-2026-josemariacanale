import { BranchImageLimitError } from '@/src/entities/errors/business';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { authWith } from '@/tests/unit/stubs';

const image = { id: 1, branchId: 3, url: 'https://img/1.png', order: 0 };
const repo = () => new BusinessesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), 'http://api');
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BusinessesRepository Imágenes de Sucursal', () => {
    it('uploads the file as multipart with the bearer token', async () => {
        const fetchSpy = respond(201, image);
        const file = new File(['x'], 'a.png', { type: 'image/png' });

        await expect(repo().uploadBranchImage(3, file)).resolves.toEqual(image);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe('http://api/branches/3/images');
        expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
        expect((init!.body as FormData).get('file')).toBeInstanceOf(File);
    });

    it('translates the 422 to BranchImageLimitError', async () => {
        respond(422, { message: 'La Sucursal ya tiene 5 imágenes' });
        await expect(repo().uploadBranchImage(3, new File([], 'a.png'))).rejects.toBeInstanceOf(BranchImageLimitError);
    });

    it('keeps a 413 as ApiRequestError', async () => {
        respond(413, { message: 'too large' });
        await expect(repo().uploadBranchImage(3, new File([], 'a.png'))).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('deletes with a 204', async () => {
        const fetchSpy = respond(204);

        await expect(repo().deleteBranchImage(3, 1)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/branches/3/images/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates a delete 404 to NotFoundError', async () => {
        respond(404, { message: 'nope' });
        await expect(repo().deleteBranchImage(3, 1)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('PUTs the new order and returns the sorted list', async () => {
        const fetchSpy = respond(200, [image]);

        await expect(repo().reorderBranchImages(3, [1])).resolves.toEqual([image]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/branches/3/images/order',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ imageIds: [1] }) }),
        );
    });

    it('keeps a reorder 422 as ApiRequestError', async () => {
        respond(422, { message: 'El orden tiene que incluir todas las imágenes de la Sucursal' });
        await expect(repo().reorderBranchImages(3, [1])).rejects.toBeInstanceOf(ApiRequestError);
    });
});
