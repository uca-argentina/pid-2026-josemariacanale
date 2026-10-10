import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
import { branchSchema, type Branch, type CreateBranch, type UpdateBranch } from '@/src/entities/models/branch';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** Escritura de Sucursales contra la API del back. */
export class BranchesRepository implements IBranchesRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    async createBranch({ businessId, ...fields }: CreateBranch): Promise<Branch> {
        return this.send('POST', `/businesses/${businessId}/branches`, fields, 'POST /businesses/:id/branches');
    }

    async updateBranch({ id, ...changes }: UpdateBranch): Promise<Branch> {
        return this.send('PATCH', `/branches/${id}`, changes, 'PATCH /branches/:id');
    }

    // 409 is the tramo in use; a 400 about the slug is InvalidSlugError, any other 400 keeps its message.
    private async send(method: 'POST' | 'PATCH', path: string, body: object, what: string): Promise<Branch> {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 409) throw new SlugTakenError(message);
        if (response.status === 400 && /slug/i.test(message)) throw new InvalidSlugError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => branchSchema.parse(json), what);
    }
}
