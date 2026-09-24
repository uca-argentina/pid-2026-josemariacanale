import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
import { businessSchema, type Business, type CreateBusiness } from '@/src/entities/models/business';

export class BusinessesRepository implements IBusinessesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

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
        if (response.status === 409) throw new SlugTakenError(String(message));
        if (response.status === 400) throw new InvalidSlugError(String(message));
        if (!response.ok) throw new ApiRequestError(String(message));

        return businessSchema.parse(body.business);
    }
}
