import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { CabinHasUpcomingBookingsError, CabinNameTakenError, InvalidCabinNameError } from '@/src/entities/errors/cabin';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { cabinSchema, type Cabin, type CreateCabin, type RenameCabin } from '@/src/entities/models/cabin';

/** Acceso a Cabinas contra la API del back. */
export class CabinsRepository implements ICabinsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * `GET /branches/:id/cabins`.
     *
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} cualquier otra falla, o un body que no son Cabinas
     */
    async listCabins(branchId: number): Promise<Cabin[]> {
        const { response, json, message } = await this.request('GET /branches/:id/cabins', `/branches/${branchId}/cabins`, 'GET');
        if (response.status === 404) throw new NotFoundError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return this.parse(() => cabinSchema.array().parse(json), 'GET /branches/:id/cabins');
    }

    /**
     * `POST /branches/:id/cabins`.
     *
     * @throws {CabinNameTakenError} 409
     * @throws {InvalidCabinNameError} 400
     * @throws {NotFoundError} 404: la Sucursal no existe
     * @throws {ApiRequestError} cualquier otra falla, o un body que no es una Cabina
     */
    async createCabin({ branchId, name }: CreateCabin): Promise<Cabin> {
        const { response, json, message } = await this.request('POST /branches/:id/cabins', `/branches/${branchId}/cabins`, 'POST', { name });
        this.throwIfFailed(response, message);
        return this.parse(() => cabinSchema.parse(json), 'POST /branches/:id/cabins');
    }

    /**
     * `PATCH /cabins/:id`.
     *
     * @throws {CabinNameTakenError} 409
     * @throws {InvalidCabinNameError} 400
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} cualquier otra falla, o un body que no es una Cabina
     */
    async renameCabin({ id, name }: RenameCabin): Promise<Cabin> {
        const { response, json, message } = await this.request('PATCH /cabins/:id', `/cabins/${id}`, 'PATCH', { name });
        this.throwIfFailed(response, message);
        return this.parse(() => cabinSchema.parse(json), 'PATCH /cabins/:id');
    }

    /**
     * `DELETE /cabins/:id`.
     *
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} cualquier otra falla, incluido el 409 de Turnos futuros
     */
    async retireCabin(id: number): Promise<void> {
        const { response, message } = await this.request('DELETE /cabins/:id', `/cabins/${id}`, 'DELETE');
        if (response.status === 409) {
            const upcoming = /^Cabin \d+ has (\d+) upcoming Turnos$/.exec(message);
            if (upcoming) throw new CabinHasUpcomingBookingsError(message, Number(upcoming[1]));
        }
        this.throwIfFailed(response, message, false);
    }

    // A 409 on DELETE is "Turnos futuros", not a name clash: only the writes that carry a name map it to CabinNameTakenError.
    private throwIfFailed(response: Response, message: string, nameWrite = true) {
        if (response.ok) return;
        if (nameWrite && response.status === 409) throw new CabinNameTakenError(message);
        if (response.status === 400) throw new InvalidCabinNameError(message);
        if (response.status === 404) throw new NotFoundError(message);
        throw new ApiRequestError(message, { status: response.status });
    }

    private async request(what: string, path: string, method: string, body?: object) {
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
                body: body && JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        return { response, json, message };
    }

    private parse<T>(parse: () => T, what: string): T {
        try {
            return parse();
        } catch (cause) {
            throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
        }
    }
}
