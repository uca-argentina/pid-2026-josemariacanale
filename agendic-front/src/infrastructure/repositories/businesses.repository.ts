import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { AlreadyOwnerError, BranchImageLimitError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { branchImageSchema, type BranchImage } from '@/src/entities/models/branch-image';
import { businessSchema, type Business, type CreateBusiness, type UpdateBusiness } from '@/src/entities/models/business';

// A body the back answered with but the schema rejects is a failure of the back, not of the
// Usuario: it becomes an ApiRequestError without status, like a network failure.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

export class BusinessesRepository implements IBusinessesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * Manda el pedido con el token de la Sesión y lee el body. Un fallo de red sale como `ApiRequestError`; el status
     * lo traduce cada método, que es el que sabe qué errores de dominio tiene.
     */
    private async request(what: string, path: string, init: { method?: string; json?: unknown; body?: FormData } = {}) {
        const token = await this.authenticationService.getAccessToken();
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (init.json !== undefined) headers['Content-Type'] = 'application/json';

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method: init.method,
                headers,
                body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const body = await response.json().catch(() => undefined);
        const message = String(body?.message ?? `${what} responded ${response.status}`);
        return { response, body, message };
    }

    async listBusinesses(): Promise<Business[]> {
        const { response, body, message } = await this.request('GET /businesses', '/businesses');
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => businessSchema.array().parse(body), 'GET /businesses');
    }

    /**
     * Solo un 400 que habla del `business.slug` se traduce a `InvalidSlugError`; cualquier otro campo inválido sale
     * como `ApiRequestError` con su mensaje real, para no disfrazarlo de slug.
     */
    async createBusiness(input: CreateBusiness): Promise<Business> {
        const { response, body, message } = await this.request('POST /businesses', '/businesses', { method: 'POST', json: input });
        // Two 409s; the back tells them apart by message (ticket 11).
        if (response.status === 409) {
            throw /ya ten[eé]s un negocio/i.test(message) ? new AlreadyOwnerError(message) : new SlugTakenError(message);
        }
        if (response.status === 400 && /business\.slug/i.test(message)) throw new InvalidSlugError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => businessSchema.parse(body?.business), 'POST /businesses');
    }

    async updateBusiness({ id, ...changes }: UpdateBusiness): Promise<Business> {
        const { response, body, message } = await this.request('PATCH /businesses/:id', `/businesses/${id}`, {
            method: 'PATCH',
            json: changes,
        });
        if (response.status === 409) throw new SlugTakenError(message);
        if (response.status === 400 && /slug/i.test(message)) throw new InvalidSlugError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => businessSchema.parse(body), 'PATCH /businesses/:id');
    }

    async uploadBusinessLogo(businessId: number, file: File): Promise<Business> {
        const form = new FormData();
        form.append('file', file);
        const { response, body, message } = await this.request('PUT /businesses/:id/logo', `/businesses/${businessId}/logo`, {
            method: 'PUT',
            body: form,
        });
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => businessSchema.parse(body), 'PUT /businesses/:id/logo');
    }

    async deleteBusinessLogo(businessId: number): Promise<void> {
        const { response, message } = await this.request('DELETE /businesses/:id/logo', `/businesses/${businessId}/logo`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
    }

    async uploadBranchImage(branchId: number, file: File): Promise<BranchImage> {
        const form = new FormData();
        form.append('file', file);
        const { response, body, message } = await this.request('POST /branches/:id/images', `/branches/${branchId}/images`, {
            method: 'POST',
            body: form,
        });
        if (response.status === 422) throw new BranchImageLimitError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => branchImageSchema.parse(body), 'POST /branches/:id/images');
    }

    async deleteBranchImage(branchId: number, imageId: number): Promise<void> {
        const { response, message } = await this.request(
            'DELETE /branches/:id/images/:imageId',
            `/branches/${branchId}/images/${imageId}`,
            { method: 'DELETE' },
        );
        if (response.ok) return;
        if (response.status === 404) throw new NotFoundError(message);
        throw new ApiRequestError(message, { status: response.status });
    }

    async reorderBranchImages(branchId: number, imageIds: number[]): Promise<BranchImage[]> {
        const { response, body, message } = await this.request('PUT /branches/:id/images/order', `/branches/${branchId}/images/order`, {
            method: 'PUT',
            json: { imageIds },
        });
        if (response.status === 404) throw new NotFoundError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => branchImageSchema.array().parse(body), 'PUT /branches/:id/images/order');
    }
}
