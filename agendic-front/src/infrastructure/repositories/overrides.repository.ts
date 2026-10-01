import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { OverrideConflictError, OverrideRuleError } from '@/src/entities/errors/override';
import { overrideSchema, type Override, type SetOverride } from '@/src/entities/models/override';

/**
 * Anulaciones contra la API del back.
 *
 * Cada método traduce el status del back así: 401 a `UnauthenticatedError`, 404 a `NotFoundError`,
 * 409 a `OverrideConflictError`, 422 a `OverrideRuleError`; cualquier otro no-OK (incluido el 403 de
 * quien no es el Dueño), o una falla de red, a `ApiRequestError`.
 */
export class OverridesRepository implements IOverridesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listOverrides(employeeId: number): Promise<Override[]> {
        const path = `/employees/${employeeId}/overrides`;
        const json = await this.request('GET', path);
        return this.parse(() => overrideSchema.array().parse(json), `GET ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {OverrideRuleError} la API respondió 422
     * @throws {OverrideConflictError} la API respondió 409
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async setOverride({ employeeId, date, ...override }: SetOverride): Promise<Override> {
        const path = `/employees/${employeeId}/overrides/${date}`;
        const json = await this.request('PUT', path, override);
        return this.parse(() => overrideSchema.parse(json), `PUT ${path}`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async removeOverride(employeeId: number, date: string): Promise<void> {
        await this.request('DELETE', `/employees/${employeeId}/overrides/${date}`);
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
        if (response.status === 409) throw new OverrideConflictError(message);
        if (response.status === 422) throw new OverrideRuleError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
