import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import {
    analyticsBusinessSchema,
    businessAnalyticsSchema,
    employeesPerPeriodSchema,
    personalAnalyticsSchema,
    type AnalyticsBusiness,
    type AnalyticsQuery,
    type BusinessAnalytics,
    type BusinessAnalyticsQuery,
    type EmployeesPerPeriod,
    type EmployeesPerPeriodQuery,
    type PersonalAnalytics,
} from '@/src/entities/models/analytics';
import { apiRequest } from './api-request';

/**
 * Analíticas del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 400 a `InputParseError`, 403 a `UnauthorizedError`, 404 a `NotFoundError`; cualquier otro no-OK,
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

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listAnalyticsBusinesses(): Promise<AnalyticsBusiness[]> {
        return this.instrumentationService.startSpan({ name: 'AnalyticsRepository > listAnalyticsBusinesses', op: 'http.client' }, async () => {
            const path = '/analytics/businesses';
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path);
            try {
                return analyticsBusinessSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {UnauthorizedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getBusinessAnalytics({ businessId, from, to, branchId, serviceId, employeeId }: BusinessAnalyticsQuery): Promise<BusinessAnalytics> {
        return this.instrumentationService.startSpan({ name: 'AnalyticsRepository > getBusinessAnalytics', op: 'http.client' }, async () => {
            const params = new URLSearchParams({ from, to });
            for (const [name, id] of Object.entries({ branchId, serviceId, employeeId })) if (id !== undefined) params.set(name, String(id));
            const path = `/analytics/businesses/${businessId}?${params}`;
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path, {
                errors: { 400: InputParseError, 403: UnauthorizedError, 404: NotFoundError },
            });
            try {
                return businessAnalyticsSchema.parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {UnauthorizedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getEmployeesPerPeriod({ businessId, from, to, granularity, branchId, serviceId }: EmployeesPerPeriodQuery): Promise<EmployeesPerPeriod> {
        return this.instrumentationService.startSpan({ name: 'AnalyticsRepository > getEmployeesPerPeriod', op: 'http.client' }, async () => {
            const params = new URLSearchParams({ from, to, granularity });
            for (const [name, id] of Object.entries({ branchId, serviceId })) if (id !== undefined) params.set(name, String(id));
            const path = `/analytics/businesses/${businessId}/employees-per-period?${params}`;
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path, {
                errors: { 400: InputParseError, 403: UnauthorizedError, 404: NotFoundError },
            });
            try {
                return employeesPerPeriodSchema.parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }
}
