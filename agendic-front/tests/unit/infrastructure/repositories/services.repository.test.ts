import { ApiRequestError } from '@/src/entities/errors/common';
import { ServiceNameTakenError, ServiceSlugTakenError } from '@/src/entities/errors/service';
import { ServicesRepository } from '@/src/infrastructure/repositories/services.repository';
import { authWith } from '@/tests/unit/stubs';

const parsedService = {
    id: 100,
    branchId: 10,
    slug: 'masaje',
    name: 'Masaje',
    description: null,
    category: 'SPA',
    durationMinutes: 60,
    price: 20000,
    depositPercent: null,
    requiresApproval: false,
    hidden: false,
    employees: [{ id: 1, name: 'Ana', availabilityId: 7 }],
};
/** The back may send fields the panel does not read yet: they are dropped. */
const service = { ...parsedService, prepMinutes: 0, dailyLimit: null };
const group = {
    business: { id: 1, name: 'Vitalia', slug: 'vitalia' },
    role: 'owner',
    employeeId: 1,
    branches: [{ id: 10, name: 'Centro', slug: 'centro', services: [service] }],
};
const input = {
    branchId: 10,
    name: 'Masaje',
    slug: 'masaje',
    description: 'Relajante',
    category: 'SPA' as const,
    durationMinutes: 60,
    price: 20000,
    employeeIds: [1],
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new ServicesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('ServicesRepository.listMyCatalog', () => {
    it('GETs the catalog with the bearer token', async () => {
        const fetchSpy = respond(200, [group]);

        await expect(repo().listMyCatalog()).resolves.toEqual([
            { ...group, branches: [{ ...group.branches[0], services: [parsedService] }] },
        ]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/me/services',
            expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('returns an empty catalog as it comes', async () => {
        respond(200, []);
        await expect(repo().listMyCatalog()).resolves.toEqual([]);
    });

    it('translates a 401 to ApiRequestError carrying the status', async () => {
        respond(401, { statusCode: 401, message: 'Unauthenticated' });
        await expect(repo().listMyCatalog()).rejects.toMatchObject({ status: 401 });
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().listMyCatalog()).rejects.toMatchObject({ status: 500 });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().listMyCatalog()).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a body that does not match the schema to ApiRequestError with the cause', async () => {
        respond(200, [{ business: 'x' }]);
        const error = await repo().listMyCatalog().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listMyCatalog().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails without calling the back when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listMyCatalog()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('ServicesRepository.createService', () => {
    it('POSTs the Servicio to its Sucursal, without the Sucursal in the body, and returns it', async () => {
        const fetchSpy = respond(201, service);

        await expect(repo().createService(input)).resolves.toEqual(parsedService);
        const { branchId, ...body } = input;
        expect(fetchSpy).toHaveBeenCalledWith(
            `http://api/branches/${branchId}/services`,
            expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
        );
    });

    it('translates the 409 of the tramo to ServiceSlugTakenError with the message of the back', async () => {
        respond(409, { statusCode: 409, message: 'Service booking link already in use' });
        const error = await repo().createService(input).catch((e) => e);
        expect(error).toBeInstanceOf(ServiceSlugTakenError);
        expect(error.message).toBe('Service booking link already in use');
    });

    it('translates the 409 of the name to ServiceNameTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Service name already in use' });
        await expect(repo().createService(input)).rejects.toBeInstanceOf(ServiceNameTakenError);
    });

    it.each([400, 403, 404, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'no' });
        await expect(repo().createService(input)).rejects.toMatchObject({ status });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 201 }));
        await expect(repo().createService(input)).rejects.toBeInstanceOf(ApiRequestError);
    });
});
