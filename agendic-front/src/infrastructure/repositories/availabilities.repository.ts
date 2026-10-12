import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import {
    availabilityDetailSchema,
    availabilitySchema,
    type Availability,
    type AvailabilityDetail,
    type CreateAvailability,
    type UpdateAvailability,
} from '@/src/entities/models/availability';
import { apiRequest } from './api-request';

/**
 * Availability del Usuario contra la API del back.
 *
 * Cada método traduce el status del back así: 401 a `UnauthenticatedError`, 404 a `NotFoundError`,
 * 422 a `AvailabilityRuleError`; cualquier otro no-OK, o una falla de red, a `ApiRequestError`.
 */
export class AvailabilitiesRepository implements IAvailabilitiesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listAvailabilities(): Promise<Availability[]> {
        const json = await this.request('GET', '/availabilities');
        return this.parse(() => availabilitySchema.array().parse(json), 'GET /availabilities');
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getAvailability(availabilityId: number): Promise<AvailabilityDetail> {
        const path = `/availabilities/${availabilityId}`;
        const json = await this.request('GET', path);
        return this.parse(() => availabilityDetailSchema.parse(json), `GET ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {AvailabilityRuleError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async createAvailability(input: CreateAvailability): Promise<void> {
        await this.request('POST', '/availabilities', input);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {AvailabilityRuleError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async updateAvailability({ availabilityId, ...body }: UpdateAvailability): Promise<void> {
        await this.request('PUT', `/availabilities/${availabilityId}`, body);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async makeDefault(availabilityId: number): Promise<void> {
        await this.request('PATCH', `/availabilities/${availabilityId}/default`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
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

    private request(method: string, path: string, body?: unknown) {
        return apiRequest(this.authenticationService, this.apiUrl, method, path, {
            body,
            errors: { 404: NotFoundError, 422: AvailabilityRuleError },
        });
    }
}
