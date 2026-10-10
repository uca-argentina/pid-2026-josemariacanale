import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
import { BranchesRepository } from '@/src/infrastructure/repositories/branches.repository';
import { authWith } from '@/tests/unit/stubs';

const branch = {
    id: 10,
    businessId: 1,
    name: 'Centro',
    address: 'Av. 1',
    timeZone: 'America/Argentina/Buenos_Aires',
    slug: 'centro',
    description: null,
};
const repo = () => new BranchesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), 'http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BranchesRepository.createBranch', () => {
    const input = {
        businessId: 1,
        name: 'Centro',
        address: 'Av. 1',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'centro',
        description: 'Con estacionamiento',
    };

    it('POSTs to the Negocio with the bearer token, without the businessId in the body', async () => {
        const fetchSpy = respond(201, { ...branch, description: 'Con estacionamiento' });
        const { businessId, ...body } = input;

        await expect(repo().createBranch(input)).resolves.toMatchObject({ id: 10, description: 'Con estacionamiento' });
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/businesses/${businessId}/branches`,
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify(body),
            }),
        );
    });

    it('translates 409 to SlugTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Booking link already in use' });
        await expect(repo().createBranch(input)).rejects.toBeInstanceOf(SlugTakenError);
    });

    it('translates a 400 about the slug to InvalidSlugError', async () => {
        respond(400, { statusCode: 400, message: ['slug must be longer than or equal to 3 characters'] });
        await expect(repo().createBranch(input)).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('keeps a 400 about another field as ApiRequestError, with its message', async () => {
        respond(400, { statusCode: 400, message: ['timeZone must be a valid IANA time zone name'] });
        const error = await repo().createBranch(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.message).toContain('timeZone');
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'Forbidden' });
        await expect(repo().createBranch(input)).rejects.toMatchObject({ status: 403 });
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().createBranch(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('translates a body that does not match the schema to ApiRequestError without status', async () => {
        respond(201, { id: 'not-a-number' });
        const error = await repo().createBranch(input).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
    });
});

describe('BranchesRepository.updateBranch', () => {
    it('PATCHes the Sucursal with only the changes, and `description: null` goes through', async () => {
        const fetchSpy = respond(200, branch);

        await expect(repo().updateBranch({ id: 10, description: null })).resolves.toEqual(branch);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/branches/10',
            expect.objectContaining({
                method: 'PATCH',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify({ description: null }),
            }),
        );
    });

    it('translates 409 to SlugTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Booking link already in use' });
        await expect(repo().updateBranch({ id: 10, slug: 'norte' })).rejects.toBeInstanceOf(SlugTakenError);
    });

    it('translates a 400 about the slug to InvalidSlugError', async () => {
        respond(400, { statusCode: 400, message: ['slug must match /^[a-z0-9]+$/'] });
        await expect(repo().updateBranch({ id: 10, slug: 'N!' })).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('translates a 404 to ApiRequestError carrying the status', async () => {
        respond(404, { statusCode: 404, message: 'Branch 10 not found' });
        await expect(repo().updateBranch({ id: 10, name: 'X' })).rejects.toMatchObject({ status: 404 });
    });
});
