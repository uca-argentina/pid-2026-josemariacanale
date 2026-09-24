import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { AlreadyOwnerError, InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
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

    async listBusinesses(): Promise<Business[]> {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/businesses`, { headers: { Authorization: `Bearer ${token}` } });
        } catch (cause) {
            throw new ApiRequestError('GET /businesses failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok)
            throw new ApiRequestError(String(body?.message ?? `GET /businesses responded ${response.status}`), {
                status: response.status,
            });

        return parseOrFail(() => businessSchema.array().parse(body), 'GET /businesses');
    }

    async createBusiness(input: CreateBusiness): Promise<Business> {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/businesses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(input),
            });
        } catch (cause) {
            throw new ApiRequestError('POST /businesses failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        const message = body?.message ?? `POST /businesses responded ${response.status}`;
        // Two 409s; the back tells them apart by message (ticket 11).
        if (response.status === 409) {
            throw /ya ten[eé]s un negocio/i.test(String(message))
                ? new AlreadyOwnerError(String(message))
                : new SlugTakenError(String(message));
        }
        if (response.status === 400) throw new InvalidSlugError(String(message));
        if (!response.ok) throw new ApiRequestError(String(message), { status: response.status });

        return parseOrFail(() => businessSchema.parse(body?.business), 'POST /businesses');
    }

    async updateBusiness({ id, ...changes }: UpdateBusiness): Promise<Business> {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/businesses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(changes),
            });
        } catch (cause) {
            throw new ApiRequestError('PATCH /businesses/:id failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        const message = String(body?.message ?? `PATCH /businesses/:id responded ${response.status}`);
        if (response.status === 409) throw new SlugTakenError(message);
        if (response.status === 400) throw new InvalidSlugError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => businessSchema.parse(body), 'PATCH /businesses/:id');
    }
}
