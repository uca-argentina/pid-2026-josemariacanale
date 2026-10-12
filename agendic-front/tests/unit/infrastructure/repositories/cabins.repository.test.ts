import { CabinNameTakenError, InvalidCabinNameError } from '@/src/entities/errors/cabin';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { CabinsRepository } from '@/src/infrastructure/repositories/cabins.repository';
import { authWith } from '@/tests/unit/stubs';

const cabin = { id: 3, branchId: 10, name: 'Box 1' };
const repo = () => new CabinsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), 'http://api');
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('CabinsRepository.listCabins', () => {
    it('GETs the Cabinas of the Sucursal with the bearer token', async () => {
        const fetchSpy = respond(200, [cabin]);

        await expect(repo().listCabins(10)).resolves.toEqual([cabin]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/branches/10/cabins',
            expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Branch 10 not found' });
        await expect(repo().listCabins(10)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'Forbidden' });
        await expect(repo().listCabins(10)).rejects.toMatchObject({ status: 403 });
    });

    it('rejects a body that is not a list of Cabinas', async () => {
        respond(200, [{ id: 'x' }]);
        await expect(repo().listCabins(10)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('CabinsRepository.createCabin', () => {
    it('POSTs only the name, without the branchId in the body', async () => {
        const fetchSpy = respond(201, cabin);

        await expect(repo().createCabin({ branchId: 10, name: 'Box 1' })).resolves.toEqual(cabin);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/branches/10/cabins',
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Box 1' }) }),
        );
    });

    it('translates 409 to CabinNameTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Cabin name Box 1 already in use in Branch 10' });
        await expect(repo().createCabin({ branchId: 10, name: 'Box 1' })).rejects.toBeInstanceOf(CabinNameTakenError);
    });

    it('translates 400 to InvalidCabinNameError', async () => {
        respond(400, { statusCode: 400, message: ['name must be shorter than or equal to 60 characters'] });
        await expect(repo().createCabin({ branchId: 10, name: 'Box 1' })).rejects.toBeInstanceOf(InvalidCabinNameError);
    });
});

describe('CabinsRepository.renameCabin', () => {
    it('PATCHes the name to the Cabina', async () => {
        const fetchSpy = respond(200, { ...cabin, name: 'Box 2' });

        await expect(repo().renameCabin({ id: 3, name: 'Box 2' })).resolves.toMatchObject({ name: 'Box 2' });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/cabins/3',
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Box 2' }) }),
        );
    });

    it.each([
        [409, CabinNameTakenError],
        [400, InvalidCabinNameError],
        [404, NotFoundError],
    ])('translates %s to its error', async (status, errorClass) => {
        respond(status, { statusCode: status, message: 'x' });
        await expect(repo().renameCabin({ id: 3, name: 'Box 2' })).rejects.toBeInstanceOf(errorClass);
    });
});

describe('CabinsRepository.retireCabin', () => {
    it('DELETEs the Cabina and resolves on 204', async () => {
        const fetchSpy = respond(204);

        await expect(repo().retireCabin(3)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/cabins/3', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Cabin 3 not found' });
        await expect(repo().retireCabin(3)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('keeps the 409 of upcoming Turnos as ApiRequestError, not as a name clash', async () => {
        respond(409, { statusCode: 409, message: 'Cabin 3 has 2 upcoming Turnos' });

        const error = await repo()
            .retireCabin(3)
            .catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error).not.toBeInstanceOf(CabinNameTakenError);
        expect(error).toMatchObject({ status: 409, message: 'Cabin 3 has 2 upcoming Turnos' });
    });
});
