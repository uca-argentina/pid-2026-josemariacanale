import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { branchSchema, type Branch } from '@/src/entities/models/branch';
import { branchImageSchema, type BranchImage } from '@/src/entities/models/branch-image';
import { resolvedBookingLinkSchema, type ResolvedBookingLink } from '@/src/entities/models/booking-link';
import { businessSchema, type Business } from '@/src/entities/models/business';
import { serviceSchema, type Service } from '@/src/entities/models/service';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

// The public endpoints behind the page of the Enlace de reserva: no Sesión, no token.
export class PublicBusinessesRepository implements IPublicBusinessesRepository {
    constructor(private readonly apiUrl = process.env.API_URL) {}

    /**
     * `GET /slugs/:slug`: whose first tramo it is.
     *
     * @throws {NotFoundError} the back answered 404
     * @throws {ApiRequestError} any other failure, or a body that is neither a Negocio nor a Usuario
     */
    async resolveSlug(slug: string): Promise<ResolvedBookingLink> {
        const body = await this.get(`/slugs/${encodeURIComponent(slug)}`, 'GET /slugs/:slug');
        return parseOrFail(() => resolvedBookingLinkSchema.parse(body), 'GET /slugs/:slug');
    }

    async getBusinessBySlug(slug: string): Promise<Business> {
        const body = await this.get(`/businesses/by-slug/${encodeURIComponent(slug)}`, 'GET /businesses/by-slug/:slug');
        return parseOrFail(() => businessSchema.parse(body), 'GET /businesses/by-slug/:slug');
    }

    async listBranches(businessId: number): Promise<Branch[]> {
        const body = await this.get(`/businesses/${businessId}/branches`, 'GET /businesses/:id/branches');
        return parseOrFail(() => branchSchema.array().parse(body), 'GET /businesses/:id/branches');
    }

    async listServices(branchId: number): Promise<Service[]> {
        const body = await this.get(`/branches/${branchId}/services`, 'GET /branches/:id/services');
        return parseOrFail(() => serviceSchema.array().parse(body), 'GET /branches/:id/services');
    }

    /**
     * Gets the Servicio of the Sucursal by its tramo, hidden or not: `GET /branches/:id/services/by-slug/:slug`.
     *
     * @throws {NotFoundError} the back answered 404
     * @throws {ApiRequestError} any other failure, or a body that is not a Servicio
     */
    async getServiceBySlug(branchId: number, slug: string): Promise<Service> {
        const what = 'GET /branches/:id/services/by-slug/:slug';
        const body = await this.get(`/branches/${branchId}/services/by-slug/${encodeURIComponent(slug)}`, what);
        return parseOrFail(() => serviceSchema.parse(body), what);
    }

    async listBranchImages(branchId: number): Promise<BranchImage[]> {
        const body = await this.get(`/branches/${branchId}/images`, 'GET /branches/:id/images');
        return parseOrFail(() => branchImageSchema.array().parse(body), 'GET /branches/:id/images');
    }

    // A 404 becomes NotFoundError; any other status that is not ok, an ApiRequestError carrying it.
    private async get(path: string, what: string) {
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`);
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 404) throw new NotFoundError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
