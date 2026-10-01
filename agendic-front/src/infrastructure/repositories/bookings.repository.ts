import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import { BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { bookingSchema, type Booking, type CreateBooking } from '@/src/entities/models/booking';
import { slotsSchema, type Slots, type SlotsQuery } from '@/src/entities/models/slot';

// Same as in BusinessesRepository: the boundaries lint keeps adapters from importing each other.
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

// Reservar from the page of the Enlace de reserva: public endpoints, no Sesión, no token.
export class BookingsRepository implements IBookingsRepository {
    constructor(private readonly apiUrl = process.env.API_URL) {}

    async listSlots({ serviceId, ...query }: SlotsQuery): Promise<Slots> {
        const params = new URLSearchParams({ employeeId: String(query.employeeId), from: query.from, to: query.to });
        const what = 'GET /services/:id/slots';
        const body = await this.request(`/services/${serviceId}/slots?${params}`, {}, what);
        return parseOrFail(() => slotsSchema.parse(body), what);
    }

    async book(input: CreateBooking): Promise<Booking> {
        const what = 'POST /bookings';
        const body = await this.request(
            '/bookings',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
            what,
        );
        return parseOrFail(() => bookingSchema.parse(body), what);
    }

    /**
     * @throws {BookingStateError} el back respondió 422: token desconocido, usado o vencido
     */
    async verifyBooking(token: string): Promise<Booking> {
        const what = 'POST /bookings/verification';
        const body = await this.request(
            '/bookings/verification',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) },
            what,
        ).catch((error) => {
            if (error instanceof ApiRequestError && error.status === 422)
                throw new BookingStateError(error.message, { cause: error });
            throw error;
        });
        return parseOrFail(() => bookingSchema.parse(body), what);
    }

    // 404 becomes NotFoundError and 409 SlotTakenError; any other status that is not ok, an
    // ApiRequestError carrying it. 400 and 422 included: the controller validated the input, so
    // they are a bug of the front and get reported.
    private async request(path: string, init: RequestInit, what: string) {
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, init);
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 409) throw new SlotTakenError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
