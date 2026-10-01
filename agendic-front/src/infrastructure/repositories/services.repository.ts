import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { ServiceNameTakenError, ServiceSlugTakenError } from '@/src/entities/errors/service';
import {
    catalogServiceSchema,
    retiredServiceSchema,
    serviceCatalogGroupSchema,
    type CatalogService,
    type CreateService,
    type RetiredService,
    type ServiceCatalogGroup,
    type UpdateService,
} from '@/src/entities/models/service';

/** Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other. */
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** The back answers both 409s of a Servicio with the same status; only this message tells the tramo one apart. */
const SLUG_TAKEN_MESSAGE = 'Service booking link already in use';

/** The panel's Servicios endpoints, with the Usuario's bearer token. */
export class ServicesRepository implements IServicesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * Lists the catalog: `GET /employees/me/services`.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    async listMyCatalog(): Promise<ServiceCatalogGroup[]> {
        const what = 'GET /employees/me/services';
        const { status, json } = await this.request('GET', '/employees/me/services');
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => serviceCatalogGroupSchema.array().parse(json), what);
    }

    /**
     * Creates a Servicio: `POST /branches/:id/services`.
     *
     * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal (409)
     * @throws {ServiceNameTakenError} the name is taken in that Sucursal (409)
     * @throws {ApiRequestError} any other failure, or a body that is not a Servicio
     */
    async createService({ branchId, ...service }: CreateService): Promise<CatalogService> {
        const what = 'POST /branches/:id/services';
        const { status, json } = await this.request('POST', `/branches/${branchId}/services`, service);
        if (status === 409) throw takenError(json, what, status);
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => catalogServiceSchema.parse(json), what);
    }

    /**
     * Changes the fields sent of a Servicio: `PATCH /services/:id`.
     *
     * @throws {ServiceSlugTakenError} the tramo is taken in that Sucursal (409)
     * @throws {ServiceNameTakenError} the name is taken in that Sucursal (409)
     * @throws {NotFoundError} the Servicio does not exist (404)
     * @throws {ApiRequestError} any other failure, or a body that is not a Servicio
     */
    async updateService({ id, ...changes }: UpdateService): Promise<CatalogService> {
        const what = 'PATCH /services/:id';
        const { status, json } = await this.request('PATCH', `/services/${id}`, changes);
        if (status === 409) throw takenError(json, what, status);
        if (status === 404) throw new NotFoundError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => catalogServiceSchema.parse(json), what);
    }

    /**
     * Dar de baja: `DELETE /services/:id`.
     *
     * @throws {NotFoundError} the Servicio does not exist or was already retired (404)
     * @throws {ApiRequestError} any other failure, or a body without the count of cancelled Turnos
     */
    async retireService(id: number): Promise<RetiredService> {
        const what = 'DELETE /services/:id';
        const { status, json } = await this.request('DELETE', `/services/${id}`);
        if (status === 404) throw new NotFoundError(messageOf(json, what, status));
        if (status >= 400) throw apiError(what, status, json);
        return parseOrFail(() => retiredServiceSchema.parse(json), what);
    }

    private async request(method: string, path: string, body?: unknown) {
        if (!this.apiUrl) throw new ApiRequestError(`${method} ${path} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${method} ${path} failed`, { cause });
        }
        return { status: response.status, json: await response.json().catch(() => undefined) };
    }
}

const messageOf = (json: { message?: unknown } | undefined, what: string, status: number) =>
    String(json?.message ?? `${what} responded ${status}`);

const apiError = (what: string, status: number, json: { message?: unknown } | undefined) =>
    new ApiRequestError(messageOf(json, what, status), { status });

const takenError = (json: { message?: unknown } | undefined, what: string, status: number) => {
    const message = messageOf(json, what, status);
    return message === SLUG_TAKEN_MESSAGE ? new ServiceSlugTakenError(message) : new ServiceNameTakenError(message);
};
