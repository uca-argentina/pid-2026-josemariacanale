import { ApiRequestError } from '@/src/entities/errors/common';
import { EmployeeAlreadyExistsError, EmployeeUserNotFoundError, LastEmployeeError } from '@/src/entities/errors/employee';
import { EmployeesRepository } from '@/src/infrastructure/repositories/employees.repository';
import { authWith } from '@/tests/unit/stubs';

const employee = { id: 3, userId: 9, name: 'Martina', email: 'martina@estudio.com' };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new EmployeesRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

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
    it('POSTs the email to the Negocio and returns the Empleado', async () => {
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

    it('translates a 422 to EmployeeUserNotFoundError keeping the back message', async () => {
        respond(422, { statusCode: 422, message: 'todavía no tiene cuenta en Agendic' });
        const error = await repo().addEmployee({ businessId: 1, email: 'x@y.com' }).catch((e) => e);
        expect(error).toBeInstanceOf(EmployeeUserNotFoundError);
        expect(error.message).toBe('todavía no tiene cuenta en Agendic');
    });

    it('translates a 409 to EmployeeAlreadyExistsError', async () => {
        respond(409, { statusCode: 409, message: 'ya es parte del Staff' });
        await expect(repo().addEmployee({ businessId: 1, email: 'x@y.com' })).rejects.toBeInstanceOf(EmployeeAlreadyExistsError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().addEmployee({ businessId: 1, email: 'x@y.com' })).rejects.toMatchObject({ status: 500 });
    });

    it('translates an invalid JSON response to ApiRequestError', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('no json', { status: 201 }));
        await expect(repo().addEmployee({ businessId: 1, email: 'x@y.com' })).rejects.toBeInstanceOf(ApiRequestError);
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

    it('translates other failures to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().retireEmployee(3)).rejects.toMatchObject({ status: 500 });
    });
});
