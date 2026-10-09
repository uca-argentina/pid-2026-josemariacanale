import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { AuthProviderDeletionError } from '@/src/entities/errors/user';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { personalServiceSchema, type PersonalService } from '@/src/entities/models/service';
import { meSchema, userPageSchema, type Me, type UserPage } from '@/src/entities/models/user';

/** Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other. */
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** `/users/me` with the Usuario's bearer token, and the public `/u/...` of an Enlace de reserva without one. */
export class UsersRepository implements IUsersRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * `GET /users/me`.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    async getMe(): Promise<Me> {
        const what = 'GET /users/me';
        const { status, json } = await this.request(what, '/users/me', { method: 'GET', auth: true });
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => meSchema.parse(json), what);
    }

    /**
     * `PATCH /users/me` with only the `slug`.
     *
     * @throws {SlugTakenError} the back answered 409
     * @throws {InvalidSlugError} the back answered 400
     * @throws {ApiRequestError} any other failure, or a body that is not a Usuario
     */
    async updateMySlug(slug: string): Promise<Me> {
        const what = 'PATCH /users/me';
        const { status, json } = await this.request(what, '/users/me', { method: 'PATCH', auth: true, body: { slug } });
        if (status === 409) throw new SlugTakenError(messageOf(json, what, status));
        if (status === 400) throw new InvalidSlugError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => meSchema.parse(json), what);
    }

    /**
     * `GET /u/:userSlug`, without a Sesión.
     *
     * @throws {NotFoundError} the back answered 404
     * @throws {ApiRequestError} any other failure, or a body that is not a page of a Usuario
     */
    async getUserPage(userSlug: string): Promise<UserPage> {
        const what = 'GET /u/:userSlug';
        const { status, json } = await this.request(what, `/u/${encodeURIComponent(userSlug)}`, { method: 'GET' });
        if (status === 404) throw new NotFoundError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => userPageSchema.parse(json), what);
    }

    /**
     * `GET /u/:userSlug/:serviceSlug`, without a Sesión.
     *
     * @throws {NotFoundError} the back answered 404
     * @throws {ApiRequestError} any other failure, or a body that is not a Servicio personal
     */
    async getPersonalService(userSlug: string, serviceSlug: string): Promise<PersonalService> {
        const what = 'GET /u/:userSlug/:serviceSlug';
        const path = `/u/${encodeURIComponent(userSlug)}/${encodeURIComponent(serviceSlug)}`;
        const { status, json } = await this.request(what, path, { method: 'GET' });
        if (status === 404) throw new NotFoundError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => personalServiceSchema.parse(json), what);
    }

    /**
     * `DELETE /users/me`.
     *
     * @throws {AuthProviderDeletionError} the back answered 502
     * @throws {ApiRequestError} any other failure; a 403 of a Usuario dado de baja keeps `status` 403
     */
    async retireMe(): Promise<void> {
        const what = 'DELETE /users/me';
        const { status, json } = await this.request(what, '/users/me', { method: 'DELETE', auth: true });
        if (status === 502) throw new AuthProviderDeletionError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
    }

    private async request(what: string, path: string, { method, auth, body }: { method: string; auth?: boolean; body?: unknown }) {
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (auth) headers.Authorization = `Bearer ${await this.authenticationService.getAccessToken()}`;

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }
        return { status: response.status, json: await response.json().catch(() => undefined) };
    }
}

const messageOf = (json: { message?: unknown } | undefined, what: string, status: number) =>
    String(json?.message ?? `${what} responded ${status}`);

const apiError = (what: string, status: number, json: { message?: unknown } | undefined) =>
    new ApiRequestError(messageOf(json, what, status), { status });
