import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InvalidSlugError, SlugTakenError } from '@/src/entities/errors/business';
import { ApiRequestError } from '@/src/entities/errors/common';
import { throwIfBranchImagesRejected } from './branch-images-rejection';
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

    /**
     * `POST /businesses/:id/branches`, multipart: los campos como JSON en `data` y cada imagen en `images`.
     *
     * @throws {SlugTakenError} 409
     * @throws {InvalidSlugError} 400 sobre el tramo
     * @throws {BranchImagesRejectedError} 400 sobre las imágenes, o 413
     * @throws {ApiRequestError} cualquier otra falla, o un body que no es una Sucursal
     */
    async createBranch({ businessId, images, ...fields }: CreateBranch): Promise<Branch> {
        const form = new FormData();
        form.append('data', JSON.stringify(fields));
        for (const image of images) form.append('images', image);
        return this.send('POST', `/businesses/${businessId}/branches`, { form }, 'POST /businesses/:id/branches');
    }

    /**
     * `PATCH /branches/:id`.
     *
     * @throws {SlugTakenError} 409
     * @throws {InvalidSlugError} 400 sobre el tramo
     * @throws {ApiRequestError} cualquier otra falla, o un body que no es una Sucursal
     */
    async updateBranch({ id, ...changes }: UpdateBranch): Promise<Branch> {
        return this.send('PATCH', `/branches/${id}`, { json: changes }, 'PATCH /branches/:id');
    }

    private async send(
        method: 'POST' | 'PATCH',
        path: string,
        body: { json: object } | { form: FormData },
        what: string,
    ): Promise<Branch> {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...('json' in body && { 'Content-Type': 'application/json' }),
                },
                body: 'json' in body ? JSON.stringify(body.json) : body.form,
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 409) throw new SlugTakenError(message);
        if (response.status === 400 && /slug/i.test(message)) throw new InvalidSlugError(message);
        throwIfBranchImagesRejected(response.status, message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });

        return parseOrFail(() => branchSchema.parse(json), what);
    }
}
