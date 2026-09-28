import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { ApiRequestError } from '@/src/entities/errors/common';
import { LastEmployeeError, EmployeeAlreadyExistsError, UserNotRegisteredError, CannotRetireOwnerError } from '@/src/entities/errors/employee';
import { employeeSchema, type CreateEmployee, type Employee } from '@/src/entities/models/employee';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

// Support a function to return the error dynamically
type ErrorByStatus = Record<number, (message: string) => Error>;

export class EmployeesRepository implements IEmployeesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    async listEmployees(businessId: number): Promise<Employee[]> {
        const body = await this.request('GET', `/businesses/${businessId}/employees`);
        return parseOrFail(() => employeeSchema.array().parse(body), 'GET /businesses/:id/employees');
    }

    async addEmployee({ businessId, ...employee }: CreateEmployee): Promise<Employee> {
        const errors = { 
            409: (msg: string) => new EmployeeAlreadyExistsError(msg), 
            422: (msg: string) => new UserNotRegisteredError(msg) 
        };
        const body = await this.request('POST', `/businesses/${businessId}/employees`, { body: employee, errors });
        return parseOrFail(() => employeeSchema.parse(body), 'POST /businesses/:id/employees');
    }

    async retireEmployee(employeeId: number): Promise<void> {
        const errors = { 
            422: (msg: string) => {
                if (msg.includes('Owner') || msg.includes('dueño')) return new CannotRetireOwnerError(msg);
                return new LastEmployeeError(msg);
            }
        };
        await this.request('DELETE', `/employees/${employeeId}`, { errors });
    }

    async getOverrides(employeeId: number): Promise<import('@/src/entities/models/employee-override').EmployeeOverride[]> {
        const body = await this.request('GET', `/employees/${employeeId}/overrides`);
        const { employeeOverrideSchema } = await import('@/src/entities/models/employee-override');
        return parseOrFail(() => employeeOverrideSchema.array().parse(body), `GET /employees/${employeeId}/overrides`);
    }

    async putOverride(employeeId: number, date: string, override: import('@/src/entities/models/employee-override').PutEmployeeOverride): Promise<void> {
        const { InvalidOverrideError, OverrideConflictError } = await import('@/src/entities/errors/employee');
        const errors = {
            422: (msg: string) => new InvalidOverrideError(msg),
            409: (msg: string) => new OverrideConflictError(msg),
            400: (msg: string) => new InvalidOverrideError(msg),
        };
        await this.request('PUT', `/employees/${employeeId}/overrides/${date}`, { body: override, errors });
    }

    async deleteOverride(employeeId: number, date: string): Promise<void> {
        await this.request('DELETE', `/employees/${employeeId}/overrides/${date}`);
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
        const knownErrorFactory = errors[response.status];
        if (knownErrorFactory) throw knownErrorFactory(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
