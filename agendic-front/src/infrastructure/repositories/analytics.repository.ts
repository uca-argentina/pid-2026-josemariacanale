import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { personalAnalyticsSchema, type AnalyticsQuery, type PersonalAnalytics } from '@/src/entities/models/analytics';
import { apiRequest } from './api-request';

/**
 * Analíticas del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 400 a `InputParseError`, 404 a `NotFoundError`; cualquier otro no-OK,
 * una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class AnalyticsRepository implements IAnalyticsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getPersonalAnalytics({ from, to, serviceId }: AnalyticsQuery): Promise<PersonalAnalytics> {
        return this.instrumentationService.startSpan({ name: 'AnalyticsRepository > getPersonalAnalytics', op: 'http.client' }, async () => {
            const params = new URLSearchParams({ from, to, ...(serviceId !== undefined && { serviceId: String(serviceId) }) });
            const path = `/analytics/personal?${params}`;
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path, {
                errors: { 400: InputParseError, 404: NotFoundError },
            });
            try {
                return personalAnalyticsSchema.parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }
}
