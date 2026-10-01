import { ApiRequestError } from '@/src/entities/errors/common';
import { AlreadyEmployeeError, InvitationNotAcceptableError, LastEmployeeError } from '@/src/entities/errors/employee';
import { EmployeesRepository } from '@/src/infrastructure/repositories/employees.repository';
import { authWith } from '@/tests/unit/stubs';

const employee = { id: 3, userId: 9, name: 'Martina', email: 'martina@estudio.com' };
const invitation = { id: 5, email: 'martina@estudio.com', expiresAt: '2026-10-08T00:00:00.000Z' };

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
    it('POSTs the email to the Negocio and returns the Invitación', async () => {
        const fetchSpy = respond(201, invitation);

        await expect(repo().addEmployee({ businessId: 1, email: 'martina@estudio.com' })).resolves.toEqual(invitation);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/1/employees',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                body: JSON.stringify({ email: 'martina@estudio.com' }),
            }),
        );
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

    it('translates other failures to ApiRequestError carrying the status', async () => {
        respond(500, { statusCode: 500, message: 'boom' });
        await expect(repo().retireEmployee(3)).rejects.toMatchObject({ status: 500 });
    });
});

describe('EmployeesRepository.addEmployee already Empleado', () => {
    it('translates a 422 to AlreadyEmployeeError', async () => {
        respond(422, { statusCode: 422, message: 'Already an Employee' });
        await expect(repo().addEmployee({ businessId: 1, email: 'martina@estudio.com' })).rejects.toBeInstanceOf(AlreadyEmployeeError);
    });
});

describe('EmployeesRepository.listInvitations', () => {
    it('GETs the pending Invitaciones of the Negocio with the bearer token', async () => {
        const fetchSpy = respond(200, [invitation]);

        await expect(repo().listInvitations(1)).resolves.toEqual([invitation]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/1/invitations',
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a 403 to ApiRequestError carrying the status', async () => {
        respond(403, { statusCode: 403, message: 'no' });
        await expect(repo().listInvitations(1)).rejects.toMatchObject({ status: 403 });
    });
});

describe('EmployeesRepository.listMyInvitations', () => {
    it('GETs the Invitaciones of the Usuario with the bearer token', async () => {
        const mine = { id: 5, business: { name: 'Estudio Norte', slug: 'estudio-norte' } };
        const fetchSpy = respond(200, [mine]);

        await expect(repo().listMyInvitations()).resolves.toEqual([mine]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/invitations/me',
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a body that does not match the schema to ApiRequestError', async () => {
        respond(200, [{ id: 'x' }]);
        await expect(repo().listMyInvitations()).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('EmployeesRepository.acceptInvitation', () => {
    it('POSTs the accept with the bearer token', async () => {
        const fetchSpy = respond(200, employee);

        await expect(repo().acceptInvitation(5)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/invitations/5/accept',
            expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('translates a 422 to InvitationNotAcceptableError keeping the message of the back', async () => {
        respond(422, { statusCode: 422, message: 'La invitación venció' });
        const error = await repo().acceptInvitation(5).catch((e) => e);
        expect(error).toBeInstanceOf(InvitationNotAcceptableError);
        expect(error.message).toBe('La invitación venció');
    });

    it('translates a 404 to ApiRequestError carrying the status', async () => {
        respond(404, { statusCode: 404, message: 'no' });
        await expect(repo().acceptInvitation(5)).rejects.toMatchObject({ status: 404 });
    });
});

describe('EmployeesRepository.rejectInvitation', () => {
    it('POSTs the reject and accepts the empty 204', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

        await expect(repo().rejectInvitation(5)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/invitations/5/reject', expect.objectContaining({ method: 'POST' }));
    });
});
