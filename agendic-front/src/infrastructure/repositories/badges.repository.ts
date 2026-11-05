import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { ApiRequestError } from '@/src/entities/errors/common';
import { myBadgeSchema, type MyBadge } from '@/src/entities/models/badge';
import { apiRequest } from './api-request';

/** Insignias del Usuario contra la API del back; 401 se traduce a `UnauthenticatedError`. */
export class BadgesRepository implements IBadgesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * `GET /users/me/badges`.
     *
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listMyBadges(): Promise<MyBadge[]> {
        return this.instrumentationService.startSpan({ name: 'BadgesRepository > listMyBadges', op: 'http.client' }, async () => {
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', '/users/me/badges');
            try {
                return myBadgeSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError('GET /users/me/badges responded with an unexpected body', { cause });
            }
        });
    }
}
