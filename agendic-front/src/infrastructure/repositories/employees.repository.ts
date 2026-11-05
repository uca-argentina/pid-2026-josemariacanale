import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
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
import {
    branchCancelledBookingSchema,
    employeeSchema,
    invitationSchema,
    myInvitationSchema,
    type BranchCancelledBooking,
    type ConfirmedEmployeeBranches,
    type CreateEmployee,
    type Employee,
    type EmployeeBranches,
    type Invitation,
    type MyInvitation,
} from '@/src/entities/models/employee';
import { cancelledBookingsSchema, type CancelledBookings } from '@/src/entities/models/left-outside-booking';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** The back's 400 for an Invitación without Sucursales (ADR 0007); its other 400s are something else. */
const BRANCHES_REQUIRED_MESSAGE = 'branchIds must have at least one Branch';
/** The back's 422 for a Sucursal of another Negocio (ADR 0007); its other 422 is "ya es Empleado". */
const BRANCH_NOT_OF_BUSINESS_MESSAGE = /^Branch \d+ is not a Branch of Business \d+$/;

/** Translates the back's message for that status into an entities error; undefined leaves it an ApiRequestError. */
type ErrorByStatus = Record<number, (message: string) => Error | undefined>;

/** The back's 422s when changing an Empleado's Sucursales (ADR 0007). */
const OWNER_WORKS_AT_EVERY_BRANCH_MESSAGE = 'The Dueño works at every Branch';
const LAST_EMPLOYEE_OF_SERVICE_MESSAGE = /^Employee \d+ is the last Employee of Service \d+$/;
/** The back's 409 when the Turnos to cancel changed since the preview (ADR 0007). */
const EMPLOYEE_BRANCHES_BOOKINGS_CHANGED_MESSAGE = 'Los Turnos que se cancelan cambiaron';

/** Shared by the preview and the PUT of an Empleado's Sucursales: they fail the same way. */
const EMPLOYEE_BRANCHES_ERRORS: ErrorByStatus = {
    404: (message) => new NotFoundError(message),
    400: (message) => (message === BRANCHES_REQUIRED_MESSAGE ? new BranchesRequiredError(message) : undefined),
    422: (message) => {
        if (message === OWNER_WORKS_AT_EVERY_BRANCH_MESSAGE) return new OwnerWorksAtEveryBranchError(message);
        if (LAST_EMPLOYEE_OF_SERVICE_MESSAGE.test(message)) return new LastEmployeeError(message);
        if (BRANCH_NOT_OF_BUSINESS_MESSAGE.test(message)) return new BranchNotOfBusinessError(message);
        return undefined;
    },
};

export class EmployeesRepository implements IEmployeesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    async listEmployees(businessId: number): Promise<Employee[]> {
        const body = await this.request('GET', `/businesses/${businessId}/employees`);
        return parseOrFail(() => employeeSchema.array().parse(body), 'GET /businesses/:id/employees');
    }

    /**
     * @throws {BranchesRequiredError} el Negocio tiene varias Sucursales y no vino ninguna (400)
     * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio (422)
     * @throws {AlreadyEmployeeError} el email ya es Empleado del Negocio (422)
     * @throws {ApiRequestError} la API respondió con otro error o con un cuerpo inesperado
     */
    async addEmployee({ businessId, ...invitation }: CreateEmployee): Promise<Invitation> {
        const body = await this.request('POST', `/businesses/${businessId}/employees`, {
            body: invitation,
            errors: {
                400: (message) => (message === BRANCHES_REQUIRED_MESSAGE ? new BranchesRequiredError(message) : undefined),
                422: (message) =>
                    BRANCH_NOT_OF_BUSINESS_MESSAGE.test(message) ? new BranchNotOfBusinessError(message) : new AlreadyEmployeeError(message),
            },
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
        await this.request('POST', `/invitations/${invitationId}/accept`, { errors: { 422: (message) => new InvitationNotAcceptableError(message) } });
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
        const body = await this.request('POST', `/invitations/${invitationId}/resend`, { errors: { 422: (message) => new InvitationNotPendingError(message) } });
        return parseOrFail(() => invitationSchema.parse(body), 'POST /invitations/:id/resend');
    }

    /**
     * @throws {InvitationNotPendingError} ya se aceptó o rechazó (422)
     * @throws {ApiRequestError} la API respondió con otro error
     */
    async cancelInvitation(invitationId: number): Promise<void> {
        await this.request('DELETE', `/invitations/${invitationId}`, { errors: { 422: (message) => new InvitationNotPendingError(message) } });
    }

    async retireEmployee(employeeId: number): Promise<void> {
        await this.request('DELETE', `/employees/${employeeId}`, { errors: { 422: (message) => new LastEmployeeError(message) } });
    }

    /**
     * @throws {BranchesRequiredError} `branchIds` vino vacío (400)
     * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio (422)
     * @throws {OwnerWorksAtEveryBranchError} al Empleado del Dueño se le saca una Sucursal (422)
     * @throws {LastEmployeeError} un Servicio se queda sin Empleados (422)
     * @throws {NotFoundError} el Empleado no existe o está dado de baja (404)
     * @throws {ApiRequestError} la API respondió con otro error o con un cuerpo inesperado
     */
    async previewEmployeeBranches({ employeeId, branchIds }: EmployeeBranches): Promise<BranchCancelledBooking[]> {
        const body = await this.request('POST', `/employees/${employeeId}/branches/preview`, { body: { branchIds }, errors: EMPLOYEE_BRANCHES_ERRORS });
        return parseOrFail(() => branchCancelledBookingSchema.array().parse(body), 'POST /employees/:id/branches/preview');
    }

    /**
     * @throws {EmployeeBranchesBookingsChangedError} se cancelaría un Turno que no está en `cancelBookingIds` (409)
     * @throws {BranchesRequiredError} `branchIds` vino vacío (400)
     * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio (422)
     * @throws {OwnerWorksAtEveryBranchError} al Empleado del Dueño se le saca una Sucursal (422)
     * @throws {LastEmployeeError} un Servicio se queda sin Empleados (422)
     * @throws {NotFoundError} el Empleado no existe o está dado de baja (404)
     * @throws {ApiRequestError} la API respondió con otro error o con un cuerpo inesperado
     */
    async changeEmployeeBranches({ employeeId, ...input }: ConfirmedEmployeeBranches): Promise<CancelledBookings> {
        const body = await this.request('PUT', `/employees/${employeeId}/branches`, {
            body: input,
            errors: {
                ...EMPLOYEE_BRANCHES_ERRORS,
                409: (message) => (message === EMPLOYEE_BRANCHES_BOOKINGS_CHANGED_MESSAGE ? new EmployeeBranchesBookingsChangedError(message) : undefined),
            },
        });
        return parseOrFail(() => cancelledBookingsSchema.parse(body), 'PUT /employees/:id/branches');
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
        const known = errors[response.status]?.(message);
        if (known) throw known;
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
