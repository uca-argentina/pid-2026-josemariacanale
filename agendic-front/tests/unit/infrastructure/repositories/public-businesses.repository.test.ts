import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { PublicBusinessesRepository } from '@/src/infrastructure/repositories/public-businesses.repository';

const business = { id: 1, name: 'Vitalia', description: 'Desc', slug: 'vitalia', ownerId: 7 };
const branch = { id: 10, businessId: 1, name: 'Centro', address: 'Av. 1', timeZone: 'America/Argentina/Buenos_Aires', slug: 'centro', description: null };
const service = { id: 100, branchId: 10, name: 'Masaje', description: null, category: 'SPA', durationMinutes: 60, price: 20000, depositPercent: null, employees: [{ id: 1, name: 'Ana' }] };

const repo = (apiUrl: string | undefined = 'http://api') => new PublicBusinessesRepository(apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('PublicBusinessesRepository.getBusinessBySlug', () => {
    it('GETs the Negocio by its Enlace de reserva, without a Sesión', async () => {
        const fetchSpy = respond(200, business);

        await expect(repo().getBusinessBySlug('vitalia')).resolves.toEqual(business);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/businesses/by-slug/vitalia');
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Business not found' });
        await expect(repo().getBusinessBySlug('nadie')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().getBusinessBySlug('vitalia')).rejects.toMatchObject({ status: 500 });
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().getBusinessBySlug('vitalia').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('translates a body that does not match the schema to ApiRequestError with the cause', async () => {
        respond(200, { id: 'not a number' });
        const error = await repo().getBusinessBySlug('vitalia').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('throws ApiRequestError without calling the back when API_URL is not set', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').getBusinessBySlug('vitalia')).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('PublicBusinessesRepository.listBranches', () => {
    it('GETs the Sucursales of the Negocio', async () => {
        const fetchSpy = respond(200, [branch]);

        await expect(repo().listBranches(1)).resolves.toEqual([branch]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/businesses/1/branches');
    });

    it('translates a Sucursal without slug to ApiRequestError', async () => {
        respond(200, [{ ...branch, slug: undefined }]);
        await expect(repo().listBranches(1)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listBranches(1)).rejects.toMatchObject({ status: 500 });
    });
});

describe('PublicBusinessesRepository.listServices', () => {
    it('GETs the active Servicios of the Sucursal, with and without Seña', async () => {
        const withDeposit = { ...service, id: 101, depositPercent: 20 };
        const fetchSpy = respond(200, [service, withDeposit]);

        await expect(repo().listServices(10)).resolves.toEqual([service, withDeposit]);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/branches/10/services');
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listServices(10)).rejects.toMatchObject({ status: 500 });
    });
});

describe('PublicBusinessesRepository.getServiceBySlug', () => {
    it('GETs the Servicio of the Sucursal by its tramo, hidden or not', async () => {
        const fetchSpy = respond(200, { ...service, slug: 'masaje', hidden: true });

        await expect(repo().getServiceBySlug(10, 'masaje')).resolves.toEqual(service);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/branches/10/services/by-slug/masaje');
    });

    it('translates a 404 (no such tramo, or dado de baja) to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().getServiceBySlug(10, 'nada')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().getServiceBySlug(10, 'masaje')).rejects.toMatchObject({ status: 500 });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().getServiceBySlug(10, 'masaje')).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a body that does not match the schema to ApiRequestError with the cause', async () => {
        respond(200, { id: 'not a number' });
        const error = await repo().getServiceBySlug(10, 'masaje').catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});

describe('PublicBusinessesRepository.listBranchImages', () => {
    it('GETs the Imágenes of the Sucursal in the order they come', async () => {
        const images = [
            { id: 2, branchId: 10, url: 'https://img.example/b.jpg', order: 0 },
            { id: 1, branchId: 10, url: 'https://img.example/a.jpg', order: 1 },
        ];
        const fetchSpy = respond(200, images);

        await expect(repo().listBranchImages(10)).resolves.toEqual(images);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/branches/10/images');
    });

    it('returns an empty list when the Sucursal has no Imágenes yet', async () => {
        respond(200, []);
        await expect(repo().listBranchImages(10)).resolves.toEqual([]);
    });

    it('translates an Imagen without url to ApiRequestError', async () => {
        respond(200, [{ id: 1, branchId: 10, order: 0 }]);
        await expect(repo().listBranchImages(10)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listBranchImages(10)).rejects.toMatchObject({ status: 500 });
    });
});
