import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { ApiRequestError } from '@/src/entities/errors/common';
import { outOfOfficeSchema, type OutOfOffice } from '@/src/entities/models/out-of-office';
import { apiRequest } from './api-request';

/**
 * Períodos Fuera de la oficina del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`; cualquier otro no-OK, una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class OutOfOfficeRepository implements IOutOfOfficeRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listOutOfOffice(): Promise<OutOfOffice[]> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > listOutOfOffice', op: 'http.client' }, async () => {
            const path = '/users/me/out-of-office';
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path);
            try {
                return outOfOfficeSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }
}
