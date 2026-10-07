import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import {
    InvalidVerificationCodeError,
    SLOT_UNAVAILABLE_MESSAGE,
    SlotTakenError,
    SlotUnavailableError,
    TooManyVerificationCodeRequestsError,
} from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { bookingSchema, type Booking, type CreateBooking } from '@/src/entities/models/booking';
import { slotsSchema, type Slots, type SlotsQuery } from '@/src/entities/models/slot';

/** Igual que en BusinessesRepository: el lint de límites impide que los adaptadores se importen entre sí. */
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** Reservar desde la página del Enlace de reserva: endpoints públicos, sin Sesión ni token de acceso. */
export class BookingsRepository implements IBookingsRepository {
    constructor(
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {NotFoundError} el back respondió 404: el Servicio ya no existe
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async listSlots({ serviceId, ...query }: SlotsQuery): Promise<Slots> {
        return this.instrumentationService.startSpan({ name: 'BookingsRepository > listSlots', op: 'http.client' }, async () => {
            const params = new URLSearchParams({ from: query.from, to: query.to });
            const what = 'GET /services/:id/slots';
            const body = await this.request(`/services/${serviceId}/slots?${params}`, {}, what);
            return parseOrFail(() => slotsSchema.parse(body), what);
        });
    }

    /**
     * Pide un Código de verificación para email (ADR 0022). 204 sin cuerpo.
     *
     * @throws {TooManyVerificationCodeRequestsError} el back respondió 429: demasiados pedidos para ese email
     * @throws {ApiRequestError} cualquier otra respuesta con error, o una falla de red
     */
    async requestVerificationCode(email: string): Promise<void> {
        return this.instrumentationService.startSpan({ name: 'BookingsRepository > requestVerificationCode', op: 'http.client' }, async () => {
            const what = 'POST /bookings/code';
            await this.request(
                '/bookings/code',
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) },
                what,
            ).catch((error) => {
                if (error instanceof ApiRequestError && error.status === 429)
                    throw new TooManyVerificationCodeRequestsError(error.message, { cause: error });
                throw error;
            });
        });
    }

    /**
     * @throws {InvalidVerificationCodeError} el back respondió 400: el código no es válido para clientEmail, o venció
     * @throws {SlotTakenError} el back respondió 409: el horario ya está ocupado
     * @throws {SlotUnavailableError} el back respondió 422: el horario ya no es un Horario reservable
     * @throws {NotFoundError} el back respondió 404: el Servicio ya no existe
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async book(input: CreateBooking): Promise<Booking> {
        return this.instrumentationService.startSpan({ name: 'BookingsRepository > book', op: 'http.client' }, async () => {
            const what = 'POST /bookings';
            const body = await this.request(
                '/bookings',
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
                what,
            ).catch((error) => {
                if (error instanceof ApiRequestError && error.status === 400)
                    throw new InvalidVerificationCodeError(error.message, { cause: error });
                throw error;
            });
            return parseOrFail(() => bookingSchema.parse(body), what);
        });
    }

    /**
     * El 404 pasa a NotFoundError, el 409 a SlotTakenError y el 422 de horario no disponible a
     * SlotUnavailableError; cualquier otro estado con error, a un ApiRequestError que lo lleva. El 400 y los
     * demás 422 quedan ahí: `book` y `requestVerificationCode` traducen los suyos (código inválido, rate
     * limit) por su cuenta; sin esa traducción, son un bug del front y se reportan.
     */
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
        if (response.status === 422 && SLOT_UNAVAILABLE_MESSAGE.test(message)) throw new SlotUnavailableError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
