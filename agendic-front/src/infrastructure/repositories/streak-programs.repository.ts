import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { FreeServiceNotAllowedError } from '@/src/entities/errors/streak';
import {
    streakProgramSchema,
    streakRewardSchema,
    type CreateStreakReward,
    type SaveStreakProgram,
    type StreakProgram,
    type StreakProgramScope,
    type StreakReward,
    type UpdateStreakReward,
} from '@/src/entities/models/streak-program';
import { apiRequest } from './api-request';

const ERRORS = { 400: InputParseError, 403: UnauthorizedError, 404: NotFoundError, 422: FreeServiceNotAllowedError };

const scopePath = ({ businessId }: StreakProgramScope) => (businessId === undefined ? '/users/me' : `/businesses/${businessId}`);

/**
 * Las Rachas contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 400 a `InputParseError`, 403 a `UnauthorizedError`, 404 a `NotFoundError`,
 * 422 a `FreeServiceNotAllowedError`; cualquier otro no-OK, una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class StreakProgramsRepository implements IStreakProgramsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} 401
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getProgram(scope: StreakProgramScope): Promise<StreakProgram> {
        return this.send('getProgram', 'GET', `${scopePath(scope)}/streak-program`, undefined, streakProgramSchema.parse);
    }

    /**
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async saveProgram({ businessId, ...body }: SaveStreakProgram): Promise<StreakProgram> {
        return this.send('saveProgram', 'PUT', `${scopePath({ businessId })}/streak-program`, body, streakProgramSchema.parse);
    }

    /**
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {FreeServiceNotAllowedError} 422
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async createReward({ businessId, ...body }: CreateStreakReward): Promise<StreakReward> {
        return this.send('createReward', 'POST', `${scopePath({ businessId })}/streak-rewards`, body, streakRewardSchema.parse);
    }

    /**
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {FreeServiceNotAllowedError} 422
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async updateReward({ id, ...body }: UpdateStreakReward): Promise<StreakReward> {
        return this.send('updateReward', 'PATCH', `/streak-rewards/${id}`, body, streakRewardSchema.parse);
    }

    /**
     * @throws {UnauthenticatedError} 401
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async deleteReward(id: number): Promise<void> {
        return this.send('deleteReward', 'DELETE', `/streak-rewards/${id}`, undefined, () => undefined);
    }

    private send<T>(repositoryMethod: string, httpMethod: string, path: string, body: object | undefined, parse: (json: unknown) => T): Promise<T> {
        return this.instrumentationService.startSpan({ name: `StreakProgramsRepository > ${repositoryMethod}`, op: 'http.client' }, async () => {
            const json = await apiRequest(this.authenticationService, this.apiUrl, httpMethod, path, { body, errors: ERRORS });
            try {
                return parse(json);
            } catch (cause) {
                throw new ApiRequestError(`${httpMethod} ${path} responded with an unexpected body`, { cause });
            }
        });
    }
}
