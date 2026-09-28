import { ApiRequestError } from '@/src/entities/errors/common';
import { LastEmployeeError, EmployeeAlreadyExistsError, UserNotRegisteredError, CannotRetireOwnerError } from '@/src/entities/errors/employee';
import { EmployeesRepository } from '@/src/infrastructure/repositories/employees.repository';
import { authWith } from '@/tests/unit/stubs';

const employee = { id: 3, userId: 123, name: 'Martina', email: 'martina@estudio.com' };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new EmployeesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(
        status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status }),
    );

afterEach(() => jest.restoreAllMocks());

describe('EmployeesRepository.listEmployees', () => {
    it('GETs the Empleados of the Negocio with the bearer token', async () => {
        const fetchSpy = respond(200, [employee]);

        await expect(repo().listEmployees(1)).resolves.toEqual([employee]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/1/employees',
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'no' });
        await expect(repo().listEmployees(1)).rejects.toMatchObject({ status: 403 });
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listEmployees(1).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('translates a body that does not match the schema to ApiRequestError without status', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listEmployees(1).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
    });

    it('fails without status when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        const error = await repo('').listEmployees(1).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('EmployeesRepository.addEmployee', () => {
    it('POSTs email to the Negocio and returns the Empleado', async () => {
        const fetchSpy = respond(201, employee);

        await expect(repo().addEmployee({ businessId: 1, email: 'martina@estudio.com' })).resolves.toEqual(employee);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/1/employees',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify({ email: 'martina@estudio.com' }),
            }),
        );
    });

    it('translates a 409 to EmployeeAlreadyExistsError', async () => {
        respond(409, { statusCode: 409, message: 'already employee' });
        await expect(repo().addEmployee({ businessId: 1, email: 'x@estudio.com' })).rejects.toBeInstanceOf(EmployeeAlreadyExistsError);
    });

    it('translates a 422 to UserNotRegisteredError', async () => {
        respond(422, { statusCode: 422, message: 'not registered' });
        await expect(repo().addEmployee({ businessId: 1, email: 'x@estudio.com' })).rejects.toBeInstanceOf(UserNotRegisteredError);
    });

    it('translates a 400 to ApiRequestError carrying the status', async () => {
        respond(400, { statusCode: 400, message: 'email must be an email' });
        await expect(repo().addEmployee({ businessId: 1, email: 'x' })).rejects.toMatchObject({ status: 400 });
    });
});

describe('EmployeesRepository.retireEmployee', () => {
    it('DELETEs the Empleado with the bearer token', async () => {
        const fetchSpy = respond(200, { cancelledBookings: 0 });

        await expect(repo().retireEmployee(3)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3',
            expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a 422 to LastEmployeeError', async () => {
        respond(422, { statusCode: 422, message: "Cannot retire the Employee: they are a Service's last Employee" });
        await expect(repo().retireEmployee(3)).rejects.toBeInstanceOf(LastEmployeeError);
    });

    it('translates a 422 about the Owner to CannotRetireOwnerError', async () => {
        respond(422, { statusCode: 422, message: "Cannot retire Owner" });
        await expect(repo().retireEmployee(3)).rejects.toBeInstanceOf(CannotRetireOwnerError);
    });

    it('translates other failures to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().retireEmployee(3)).rejects.toMatchObject({ status: 500 });
    });
});

describe('EmployeesRepository.getOverrides', () => {
    it('GETs the overrides of an employee, handling null coveredByEmployeeId', async () => {
        respond(200, [{ date: '2026-10-10', intervals: [], coveredByEmployeeId: null }]);
        const overrides = await repo().getOverrides(1);
        expect(overrides).toEqual([{ date: '2026-10-10', intervals: [], coveredByEmployeeId: undefined }]);
    });

    it('translates invalid body to ApiRequestError without status', async () => {
        respond(200, [{ date: 123 }]);
        await expect(repo().getOverrides(1)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('EmployeesRepository.putOverride', () => {
    it('PUTs an override for 200 response', async () => {
        const fetchSpy = respond(200, { date: '2026-10-10', intervals: [] });
        await repo().putOverride(1, '2026-10-10', { intervals: [] });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/1/overrides/2026-10-10',
            expect.objectContaining({ method: 'PUT' }),
        );
    });

    it('translates 422 to InvalidOverrideError', async () => {
        const { InvalidOverrideError } = await import('@/src/entities/errors/employee');
        respond(422, { statusCode: 422, message: 'Solapadas' });
        await expect(repo().putOverride(1, '2026-10-10', { intervals: [] })).rejects.toBeInstanceOf(InvalidOverrideError);
    });

    it('translates 409 to OverrideConflictError', async () => {
        const { OverrideConflictError } = await import('@/src/entities/errors/employee');
        respond(409, { statusCode: 409, message: 'Conflicto' });
        await expect(repo().putOverride(1, '2026-10-10', { intervals: [] })).rejects.toBeInstanceOf(OverrideConflictError);
    });

    it('translates 500 to ApiRequestError carrying status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().putOverride(1, '2026-10-10', { intervals: [] })).rejects.toMatchObject({ status: 500 });
    });
});

describe('EmployeesRepository.deleteOverride', () => {
    it('DELETEs an override for 204 response', async () => {
        const fetchSpy = respond(204, null);
        await repo().deleteOverride(1, '2026-10-10');
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/1/overrides/2026-10-10',
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    it('translates 500 to ApiRequestError carrying status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().deleteOverride(1, '2026-10-10')).rejects.toMatchObject({ status: 500 });
    });
});
