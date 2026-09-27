import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { SlotConflictError } from '@/src/entities/errors/booking';
import { ApiRequestError } from '@/src/entities/errors/common';
import { bookingSchema, type Booking, type CreateBooking } from '@/src/entities/models/booking';
import { serviceSlotsSchema, type ServiceSlots } from '@/src/entities/models/slot';

function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

export class BookingsRepository implements IBookingsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    async createBooking(input: CreateBooking): Promise<Booking> {
        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
        } catch (cause) {
            throw new ApiRequestError('POST /bookings failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        const message = body?.message ?? `POST /bookings responded ${response.status}`;

        if (response.status === 409) {
            throw new SlotConflictError(String(message));
        }
        if (!response.ok) {
            throw new ApiRequestError(String(message), { status: response.status });
        }

        return parseOrFail(() => bookingSchema.parse(body), 'POST /bookings');
    }

    async getServiceSlots(serviceId: number, employeeId: number, from: string, to: string): Promise<ServiceSlots> {
        let response: Response;
        try {
            const query = new URLSearchParams({
                employeeId: String(employeeId),
                from,
                to,
            });
            response = await fetch(`${this.apiUrl}/services/${serviceId}/slots?${query.toString()}`);
        } catch (cause) {
            throw new ApiRequestError('GET /services/:id/slots failed', { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(String(body?.message ?? `GET /services/:id/slots responded ${response.status}`), {
                status: response.status,
            });
        }

        return parseOrFail(() => serviceSlotsSchema.parse(body), 'GET /services/:id/slots');
    }

    async payDeposit(bookingId: number): Promise<Booking> {
        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/bookings/${bookingId}/pay-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (cause) {
            throw new ApiRequestError(`POST /bookings/${bookingId}/pay-deposit failed`, { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(
                String(body?.message ?? `POST /bookings/${bookingId}/pay-deposit responded ${response.status}`),
                { status: response.status },
            );
        }

        return parseOrFail(() => bookingSchema.parse(body), `POST /bookings/${bookingId}/pay-deposit`);
    }

    async updateStatus(bookingId: number, status: string): Promise<Booking> {
        const token = await this.authenticationService.getAccessToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status }),
            });
        } catch (cause) {
            throw new ApiRequestError(`PATCH /bookings/${bookingId}/status failed`, { cause });
        }

        const body = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new ApiRequestError(
                String(body?.message ?? `PATCH /bookings/${bookingId}/status responded ${response.status}`),
                { status: response.status },
            );
        }

        return parseOrFail(() => bookingSchema.parse(body), `PATCH /bookings/${bookingId}/status`);
    }
}
