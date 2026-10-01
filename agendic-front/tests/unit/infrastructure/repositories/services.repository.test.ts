import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { LastEmployeeError } from '@/src/entities/errors/employee';
import { EmployeeNotAssignableError, ServiceNameTakenError, ServiceSlugTakenError } from '@/src/entities/errors/service';
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
    prepMinutes: 10,
    dailyLimit: null,
    employees: [{ id: 1, name: 'Ana', availabilityId: 7 }],
};
/** The back may send fields the panel does not read: they are dropped. */
const service = { ...parsedService, createdAt: '2026-09-01T00:00:00.000Z' };
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

describe('ServicesRepository.updateService', () => {
    it('PATCHes only the fields sent, without the id in the body, and returns the Servicio', async () => {
        const fetchSpy = respond(200, service);

        await expect(repo().updateService({ id: 100, name: 'Masaje', depositPercent: null })).resolves.toEqual(parsedService);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100',
            expect.objectContaining({
                method: 'PATCH',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify({ name: 'Masaje', depositPercent: null }),
            }),
        );
    });

    it('PATCHes the Tiempo de preparación and drops the Límite diario with null', async () => {
        const fetchSpy = respond(200, { ...service, prepMinutes: 15, dailyLimit: null });

        await expect(repo().updateService({ id: 100, prepMinutes: 15, dailyLimit: null })).resolves.toMatchObject({
            prepMinutes: 15,
            dailyLimit: null,
        });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100',
            expect.objectContaining({ body: JSON.stringify({ prepMinutes: 15, dailyLimit: null }) }),
        );
    });

    it('translates the 400 of a Límite diario under 1 to ApiRequestError carrying the status', async () => {
        respond(400, { statusCode: 400, message: ['dailyLimit must not be less than 1'] });
        await expect(repo().updateService({ id: 100, dailyLimit: 0 })).rejects.toMatchObject({ status: 400 });
    });

    it('translates a Servicio without Tiempo de preparación to ApiRequestError', async () => {
        respond(200, { ...service, prepMinutes: undefined });
        await expect(repo().updateService({ id: 100, prepMinutes: 15 })).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates the 409 of the tramo to ServiceSlugTakenError with the message of the back', async () => {
        respond(409, { statusCode: 409, message: 'Service booking link already in use' });
        const error = await repo().updateService({ id: 100, slug: 'masaje' }).catch((e) => e);
        expect(error).toBeInstanceOf(ServiceSlugTakenError);
        expect(error.message).toBe('Service booking link already in use');
    });

    it('translates the 409 of the name to ServiceNameTakenError', async () => {
        respond(409, { statusCode: 409, message: 'Service name already in use' });
        await expect(repo().updateService({ id: 100, name: 'Masaje' })).rejects.toBeInstanceOf(ServiceNameTakenError);
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().updateService({ id: 100, hidden: true })).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([400, 401, 403, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'no' });
        await expect(repo().updateService({ id: 100, hidden: true })).rejects.toMatchObject({ status });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().updateService({ id: 100, hidden: true })).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('ServicesRepository.retireService', () => {
    it('DELETEs the Servicio and returns how many Turnos got cancelled', async () => {
        const fetchSpy = respond(200, { cancelledBookings: 2 });

        await expect(repo().retireService(100)).resolves.toEqual({ cancelledBookings: 2 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100',
            expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().retireService(100)).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([401, 403, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'no' });
        await expect(repo().retireService(100)).rejects.toMatchObject({ status });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().retireService(100)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a body without the count to ApiRequestError', async () => {
        respond(200, { ok: true });
        await expect(repo().retireService(100)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('ServicesRepository.assignEmployee', () => {
    it('POSTs the Empleado to the Servicio, without an Availability, and returns the Servicio', async () => {
        const fetchSpy = respond(200, service);

        await expect(repo().assignEmployee({ serviceId: 100, employeeId: 1 })).resolves.toEqual(parsedService);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100/employees',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify({ employeeId: 1 }),
            }),
        );
    });

    it('translates the 422 to EmployeeNotAssignableError with the message of the back', async () => {
        respond(422, { statusCode: 422, message: 'The Employee is retired' });
        const error = await repo().assignEmployee({ serviceId: 100, employeeId: 1 }).catch((e) => e);
        expect(error).toBeInstanceOf(EmployeeNotAssignableError);
        expect(error.message).toBe('The Employee is retired');
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Service not found' });
        await expect(repo().assignEmployee({ serviceId: 100, employeeId: 1 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([400, 401, 403, 409, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'no' });
        await expect(repo().assignEmployee({ serviceId: 100, employeeId: 1 })).rejects.toMatchObject({ status });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().assignEmployee({ serviceId: 100, employeeId: 1 })).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('ServicesRepository.removeEmployee', () => {
    it('DELETEs the Empleado from the Servicio and returns how many Turnos got cancelled', async () => {
        const fetchSpy = respond(200, { cancelledBookings: 1 });

        await expect(repo().removeEmployee({ serviceId: 100, employeeId: 1 })).resolves.toEqual({ cancelledBookings: 1 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/100/employees/1',
            expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates the 422 to LastEmployeeError with the message of the back', async () => {
        respond(422, { statusCode: 422, message: 'Last Employee of the Service' });
        const error = await repo().removeEmployee({ serviceId: 100, employeeId: 1 }).catch((e) => e);
        expect(error).toBeInstanceOf(LastEmployeeError);
        expect(error.message).toBe('Last Employee of the Service');
    });

    it('translates a 404 to NotFoundError', async () => {
        respond(404, { statusCode: 404, message: 'Employee not found' });
        await expect(repo().removeEmployee({ serviceId: 100, employeeId: 1 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([401, 403, 500])('translates a %i to ApiRequestError carrying the status', async (status) => {
        respond(status, { statusCode: status, message: 'no' });
        await expect(repo().removeEmployee({ serviceId: 100, employeeId: 1 })).rejects.toMatchObject({ status });
    });

    it('translates a body that is not JSON to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
        await expect(repo().removeEmployee({ serviceId: 100, employeeId: 1 })).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a body without the count to ApiRequestError', async () => {
        respond(200, {});
        await expect(repo().removeEmployee({ serviceId: 100, employeeId: 1 })).rejects.toBeInstanceOf(ApiRequestError);
    });
});
