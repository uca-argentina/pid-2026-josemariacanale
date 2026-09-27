import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { PublicBusinessRepository } from '@/src/infrastructure/repositories/public-business.repository';

const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };
const branch = { id: 1, businessId: 1, name: 'Centro', address: 'Av. 1', opensAt: '09:00', closesAt: '18:00' };
const service = {
    id: 1,
    branchId: 1,
    name: 'Corte',
    description: 'Corte de pelo',
    category: 'SPA' as const,
    durationMinutes: 30,
    price: 1500,
    employees: [{ id: 1, name: 'Juan' }],
};

const repo = () => new PublicBusinessRepository('http://api');
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('PublicBusinessRepository.getBusinessBySlug', () => {
    it('GETs the business by slug and returns it', async () => {
        const fetchSpy = respond(200, business);

        await expect(repo().getBusinessBySlug('estudio')).resolves.toEqual(business);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/businesses/by-slug/estudio');
    });

    it('translates 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Business not found' });
        await expect(repo().getBusinessBySlug('inexistente')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates 500 to ApiRequestError carrying status', async () => {
        respond(500, { statusCode: 500, message: 'Internal error' });
        await expect(repo().getBusinessBySlug('estudio')).rejects.toMatchObject({ status: 500 });
    });

    it('translates network failure to ApiRequestError without status', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('network down'));
        await expect(repo().getBusinessBySlug('estudio')).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('PublicBusinessRepository.listBranches', () => {
    it('GETs branches of a business', async () => {
        const fetchSpy = respond(200, [branch]);

        await expect(repo().listBranches(1)).resolves.toEqual([branch]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/businesses/1/branches');
    });

    it('translates failure to ApiRequestError', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listBranches(1)).rejects.toMatchObject({ status: 500 });
    });
});

describe('PublicBusinessRepository.listServices', () => {
    it('GETs active services of a branch', async () => {
        const fetchSpy = respond(200, [service]);

        await expect(repo().listServices(1)).resolves.toEqual([service]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/branches/1/services');
    });

    it('translates failure to ApiRequestError', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listServices(1)).rejects.toMatchObject({ status: 500 });
    });
});
