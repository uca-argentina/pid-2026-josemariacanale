import { ApiRequestError } from '@/src/entities/errors/common';
import {
    AlreadyEmployeeError,
    BranchesRequiredError,
    BranchNotOfBusinessError,
    EmployeeBranchesBookingsChangedError,
    InvitationNotAcceptableError,
    InvitationNotPendingError,
    LastEmployeeError,
    OwnerWorksAtEveryBranchError,
} from '@/src/entities/errors/employee';
import { EmployeesRepository } from '@/src/infrastructure/repositories/employees.repository';
import { authWith } from '@/tests/unit/stubs';

const employee = { id: 3, userId: 9, name: 'Martina', email: 'martina@estudio.com', imageUrl: null, branchIds: [1, 2], badges: [{ badge: 'attended', name: 'Turnos atendidos', level: 'gold' }] };
const invitation = { id: 5, email: 'martina@estudio.com', expiresAt: '2026-10-08T00:00:00.000Z', branchIds: [2] };

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

    it('maps an Empleado without Insignias to an empty badges list', async () => {
        respond(200, [{ ...employee, badges: [] }]);
        await expect(repo().listEmployees(1)).resolves.toEqual([{ ...employee, badges: [] }]);
    });

    it('rejects a badge whose level is not a Nivel', async () => {
        respond(200, [{ ...employee, badges: [{ badge: 'attended', name: 'Turnos atendidos', level: 'diamond' }] }]);
        await expect(repo().listEmployees(1)).rejects.toBeInstanceOf(ApiRequestError);
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

describe('EmployeesRepository.addEmployee with Sucursales', () => {
    it('sends the branchIds in the body', async () => {
        const fetchSpy = respond(201, invitation);

        await repo().addEmployee({ businessId: 1, email: 'martina@estudio.com', branchIds: [2] });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/1/employees',
            expect.objectContaining({ body: JSON.stringify({ email: 'martina@estudio.com', branchIds: [2] }) }),
        );
    });

    it('translates the 400 of no Sucursal to BranchesRequiredError', async () => {
        respond(400, { statusCode: 400, message: 'branchIds must have at least one Branch' });
        await expect(repo().addEmployee({ businessId: 1, email: 'martina@estudio.com' })).rejects.toBeInstanceOf(BranchesRequiredError);
    });

    it('translates the 422 of a Sucursal of another Negocio to BranchNotOfBusinessError', async () => {
        respond(422, { statusCode: 422, message: 'Branch 9 is not a Branch of Business 1' });
        await expect(repo().addEmployee({ businessId: 1, email: 'martina@estudio.com', branchIds: [9] })).rejects.toBeInstanceOf(
            BranchNotOfBusinessError,
        );
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
        const mine = { id: 5, business: { name: 'Estudio Norte', slug: 'estudio-norte' }, branches: [{ id: 2, name: 'Centro' }] };
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

describe('EmployeesRepository.resendInvitation', () => {
    it('POSTs the resend and returns the renewed Invitación', async () => {
        const fetchSpy = respond(200, invitation);

        await expect(repo().resendInvitation(5)).resolves.toEqual(invitation);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/invitations/5/resend', expect.objectContaining({ method: 'POST' }));
    });

    it('translates a 422 to InvitationNotPendingError with the back message', async () => {
        respond(422, { statusCode: 422, message: 'La invitación ya fue respondida' });
        await expect(repo().resendInvitation(5)).rejects.toThrow(InvitationNotPendingError);
    });

    it('translates a 404 to ApiRequestError carrying the status', async () => {
        respond(404, { statusCode: 404, message: 'no' });
        await expect(repo().resendInvitation(5)).rejects.toMatchObject({ status: 404 });
    });
});

describe('EmployeesRepository.cancelInvitation', () => {
    it('DELETEs the Invitación and accepts the empty 204', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

        await expect(repo().cancelInvitation(5)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/invitations/5', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates a 422 to InvitationNotPendingError', async () => {
        respond(422, { statusCode: 422, message: 'x' });
        await expect(repo().cancelInvitation(5)).rejects.toThrow(InvitationNotPendingError);
    });
});

const cancelledBooking = {
    id: 40,
    startsAt: '2026-11-10T13:00:00.000Z',
    endsAt: '2026-11-10T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    branch: { id: 2, name: 'Palermo' },
};

describe('EmployeesRepository.previewEmployeeBranches', () => {
    it('POSTs the Sucursales and returns the Turnos that would be cancelled', async () => {
        const fetchSpy = respond(200, [cancelledBooking]);

        await expect(repo().previewEmployeeBranches({ employeeId: 3, branchIds: [1] })).resolves.toEqual([cancelledBooking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/branches/preview',
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ branchIds: [1] }) }),
        );
    });

    it('translates a body that does not match the schema to ApiRequestError', async () => {
        respond(200, [{ id: 40 }]);
        await expect(repo().previewEmployeeBranches({ employeeId: 3, branchIds: [1] })).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('EmployeesRepository.changeEmployeeBranches', () => {
    const input = { employeeId: 3, branchIds: [1], cancelBookingIds: [40] };

    it('PUTs the Sucursales with the confirmed Turnos and returns how many were cancelled', async () => {
        const fetchSpy = respond(200, { ...employee, branchIds: [1], cancelledBookings: 1 });

        await expect(repo().changeEmployeeBranches(input)).resolves.toEqual({ cancelledBookings: 1 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/employees/3/branches',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ branchIds: [1], cancelBookingIds: [40] }) }),
        );
    });

    it('translates the 409 of Turnos that changed to EmployeeBranchesBookingsChangedError', async () => {
        respond(409, { statusCode: 409, message: 'Los Turnos que se cancelan cambiaron' });
        await expect(repo().changeEmployeeBranches(input)).rejects.toBeInstanceOf(EmployeeBranchesBookingsChangedError);
    });

    it.each([
        ['the last Empleado of a Servicio', 'Employee 3 is the last Employee of Service 8', LastEmployeeError],
        ['the Dueño losing a Sucursal', 'The Dueño works at every Branch', OwnerWorksAtEveryBranchError],
        ['a Sucursal of another Negocio', 'Branch 9 is not a Branch of Business 1', BranchNotOfBusinessError],
    ])('translates the 422 of %s, keeping the back message', async (_case, message, ErrorClass) => {
        respond(422, { statusCode: 422, message });
        await expect(repo().changeEmployeeBranches(input)).rejects.toEqual(expect.objectContaining({ constructor: ErrorClass, message }));
    });

    it('translates the 422s the same way on the preview', async () => {
        respond(422, { statusCode: 422, message: 'The Dueño works at every Branch' });
        await expect(repo().previewEmployeeBranches(input)).rejects.toBeInstanceOf(OwnerWorksAtEveryBranchError);
    });

    it('translates the 400 without Sucursales to BranchesRequiredError', async () => {
        respond(400, { statusCode: 400, message: 'branchIds must have at least one Branch' });
        await expect(repo().changeEmployeeBranches(input)).rejects.toBeInstanceOf(BranchesRequiredError);
    });

    it('leaves a 404 as ApiRequestError carrying the status', async () => {
        respond(404, { statusCode: 404, message: 'Employee 3 not found' });
        await expect(repo().changeEmployeeBranches(input)).rejects.toMatchObject({ status: 404 });
    });
});
