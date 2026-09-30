import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AvailabilityInUseError, AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import {
    availabilitySchema,
    type Availability,
    type CreateAvailability,
    type UpdateAvailability,
} from '@/src/entities/models/availability';

/**
 * Availability contra la API del back.
 *
 * Cada método traduce el status del back así: 401 a `UnauthenticatedError`, 404 a `NotFoundError`,
 * 409 a `AvailabilityInUseError`, 422 a `AvailabilityRuleError`; cualquier otro no-OK (incluido el
 * 403 de quien no es el Dueño), o una falla de red, a `ApiRequestError`.
 */
export class AvailabilitiesRepository implements IAvailabilitiesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listAvailabilities(employeeId: number): Promise<Availability[]> {
        const path = `/employees/${employeeId}/availabilities`;
        const json = await this.request('GET', path);
        return this.parse(() => availabilitySchema.array().parse(json), `GET ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {AvailabilityRuleError} la API respondió 422
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async createAvailability({ employeeId, ...availability }: CreateAvailability): Promise<Availability> {
        const path = `/employees/${employeeId}/availabilities`;
        const json = await this.request('POST', path, availability);
        return this.parse(() => availabilitySchema.parse(json), `POST ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {AvailabilityRuleError} la API respondió 422
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async updateAvailability({ availabilityId, ...changes }: UpdateAvailability): Promise<Availability> {
        const path = `/availabilities/${availabilityId}`;
        const json = await this.request('PATCH', path, changes);
        return this.parse(() => availabilitySchema.parse(json), `PATCH ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async makeDefault(availabilityId: number): Promise<Availability> {
        const path = `/availabilities/${availabilityId}/default`;
        const json = await this.request('POST', path);
        return this.parse(() => availabilitySchema.parse(json), `POST ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {AvailabilityInUseError} la API respondió 409
     * @throws {AvailabilityRuleError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async deleteAvailability(availabilityId: number): Promise<void> {
        await this.request('DELETE', `/availabilities/${availabilityId}`);
    }

    private parse<T>(parse: () => T, what: string): T {
        try {
            return parse();
        } catch (cause) {
            throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
        }
    }

    private async request(method: string, path: string, body?: unknown) {
        const what = `${method} ${path}`;
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body !== undefined && { 'Content-Type': 'application/json' }),
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 401) throw new UnauthenticatedError(message);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 409) throw new AvailabilityInUseError(message);
        if (response.status === 422) throw new AvailabilityRuleError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
