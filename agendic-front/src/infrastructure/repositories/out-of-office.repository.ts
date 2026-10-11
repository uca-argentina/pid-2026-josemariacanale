import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';
import { outOfOfficeSchema, type OutOfOffice } from '@/src/entities/models/out-of-office';

/**
 * Períodos Fuera de la oficina del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`; cualquier otro no-OK, una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class OutOfOfficeRepository implements IOutOfOfficeRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listOutOfOffice(): Promise<OutOfOffice[]> {
        const path = '/users/me/out-of-office';
        const what = `GET ${path}`;
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 401) throw new UnauthenticatedError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        try {
            return outOfOfficeSchema.array().parse(json);
        } catch (cause) {
            throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
        }
    }
}
