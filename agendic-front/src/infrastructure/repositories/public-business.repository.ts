import type { IPublicBusinessRepository } from '@/src/application/repositories/public-business.repository.interface';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { branchSchema, type Branch } from '@/src/entities/models/branch';
import { businessSchema, type Business } from '@/src/entities/models/business';
import { serviceSchema, type Service } from '@/src/entities/models/service';

function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

export class PublicBusinessRepository implements IPublicBusinessRepository {
    constructor(private readonly apiUrl = process.env.API_URL) {}

    async getBusinessBySlug(slug: string): Promise<Business> {
        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/businesses/by-slug/${encodeURIComponent(slug)}`);
        } catch (cause) {
            throw new ApiRequestError('GET /businesses/by-slug/:slug failed', { cause });
        }

        if (response.status === 404) {
            throw new NotFoundError(`Business with slug '${slug}' not found`);
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(String(body?.message ?? `GET /businesses/by-slug responded ${response.status}`), {
                status: response.status,
            });
        }

        return parseOrFail(() => businessSchema.parse(body), 'GET /businesses/by-slug/:slug');
    }

    async listBranches(businessId: number): Promise<Branch[]> {
        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/businesses/${businessId}/branches`);
        } catch (cause) {
            throw new ApiRequestError('GET /businesses/:id/branches failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(String(body?.message ?? `GET /businesses/:id/branches responded ${response.status}`), {
                status: response.status,
            });
        }

        return parseOrFail(() => branchSchema.array().parse(body), 'GET /businesses/:id/branches');
    }

    async listServices(branchId: number): Promise<Service[]> {
        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/branches/${branchId}/services`);
        } catch (cause) {
            throw new ApiRequestError('GET /branches/:id/services failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(String(body?.message ?? `GET /branches/:id/services responded ${response.status}`), {
                status: response.status,
            });
        }

        return parseOrFail(() => serviceSchema.array().parse(body), 'GET /branches/:id/services');
    }
}
