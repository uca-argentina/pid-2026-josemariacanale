import type { ISlotsRepository } from '@/src/application/repositories/slots.repository.interface';
import { ApiRequestError, NotFoundError, ValidationError } from '@/src/entities/errors/common';
import { serviceSlotsSchema, type ServiceSlots } from '@/src/entities/models/slot';

function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

export class SlotsRepository implements ISlotsRepository {
    constructor(private readonly apiUrl = process.env.API_URL) {}

    async getSlots(serviceId: number, employeeId: number, from: string, to: string): Promise<ServiceSlots> {
        let response: Response;
        const url = `${this.apiUrl}/services/${serviceId}/slots?employeeId=${employeeId}&from=${from}&to=${to}`;
        try {
            response = await fetch(url);
        } catch (cause) {
            throw new ApiRequestError('GET /services/:id/slots failed', { cause });
        }

        let body: unknown;
        try {
            body = await response.json();
        } catch (cause) {
            if (!response.ok) {
                throw new ApiRequestError(`GET /services/:id/slots responded ${response.status}`, {
                    status: response.status,
                });
            }
            throw new ApiRequestError('GET /services/:id/slots responded with an unexpected body', { cause });
        }

        const message = (body as { message?: string })?.message ?? `GET /services/:id/slots responded ${response.status}`;
        if (response.status === 404) throw new NotFoundError(String(message));
        if (response.status === 422 || response.status === 400) throw new ValidationError(String(message));
        if (!response.ok) throw new ApiRequestError(String(message), { status: response.status });

        return parseOrFail(() => serviceSlotsSchema.parse(body), 'GET /services/:id/slots');
    }
}
