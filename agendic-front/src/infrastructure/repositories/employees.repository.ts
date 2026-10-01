import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { ApiRequestError } from '@/src/entities/errors/common';
import { AlreadyEmployeeError, InvitationNotAcceptableError, InvitationNotPendingError, LastEmployeeError } from '@/src/entities/errors/employee';
import { employeeSchema, invitationSchema, myInvitationSchema, type CreateEmployee, type Employee, type Invitation, type MyInvitation } from '@/src/entities/models/employee';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

type ErrorByStatus = Record<number, new (message: string) => Error>;

export class EmployeesRepository implements IEmployeesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    async listEmployees(businessId: number): Promise<Employee[]> {
        const body = await this.request('GET', `/businesses/${businessId}/employees`);
        return parseOrFail(() => employeeSchema.array().parse(body), 'GET /businesses/:id/employees');
    }

    async addEmployee({ businessId, ...invitation }: CreateEmployee): Promise<Invitation> {
        const body = await this.request('POST', `/businesses/${businessId}/employees`, {
            body: invitation,
            errors: { 422: AlreadyEmployeeError },
        });
        return parseOrFail(() => invitationSchema.parse(body), 'POST /businesses/:id/employees');
    }

    async listInvitations(businessId: number): Promise<Invitation[]> {
        const body = await this.request('GET', `/businesses/${businessId}/invitations`);
        return parseOrFail(() => invitationSchema.array().parse(body), 'GET /businesses/:id/invitations');
    }

    /** @throws {ApiRequestError} la API respondió con error o con un cuerpo inesperado */
    async listMyInvitations(): Promise<MyInvitation[]> {
        const body = await this.request('GET', '/invitations/me');
        return parseOrFail(() => myInvitationSchema.array().parse(body), 'GET /invitations/me');
    }

    /**
     * @throws {InvitationNotAcceptableError} la Invitación venció o ya es Empleado (422)
     * @throws {ApiRequestError} la API respondió con otro error
     */
    async acceptInvitation(invitationId: number): Promise<void> {
        await this.request('POST', `/invitations/${invitationId}/accept`, { errors: { 422: InvitationNotAcceptableError } });
    }

    /** @throws {ApiRequestError} la API respondió con error */
    async rejectInvitation(invitationId: number): Promise<void> {
        await this.request('POST', `/invitations/${invitationId}/reject`);
    }

    /**
     * @throws {InvitationNotPendingError} ya se aceptó o rechazó (422)
     * @throws {ApiRequestError} la API respondió con otro error o con un cuerpo inesperado
     */
    async resendInvitation(invitationId: number): Promise<Invitation> {
        const body = await this.request('POST', `/invitations/${invitationId}/resend`, { errors: { 422: InvitationNotPendingError } });
        return parseOrFail(() => invitationSchema.parse(body), 'POST /invitations/:id/resend');
    }

    /**
     * @throws {InvitationNotPendingError} ya se aceptó o rechazó (422)
     * @throws {ApiRequestError} la API respondió con otro error
     */
    async cancelInvitation(invitationId: number): Promise<void> {
        await this.request('DELETE', `/invitations/${invitationId}`, { errors: { 422: InvitationNotPendingError } });
    }

    async retireEmployee(employeeId: number): Promise<void> {
        await this.request('DELETE', `/employees/${employeeId}`, { errors: { 422: LastEmployeeError } });
    }

    // Any status not in `errors` that is not ok becomes an ApiRequestError carrying it.
    private async request(method: string, path: string, { body, errors = {} }: { body?: unknown; errors?: ErrorByStatus } = {}) {
        const what = `${method} ${path}`;
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        const KnownError = errors[response.status];
        if (KnownError) throw new KnownError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
