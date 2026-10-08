import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { SLOT_UNAVAILABLE_MESSAGE, SlotTakenError, SlotUnavailableError, BookingStateError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { clientBookingSchema, type ClientBooking } from '@/src/entities/models/client-booking';

function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/**
 * El Turno de un Enlace del Turno contra la API del back.
 *
 * Cada método traduce el status del back así: 404 a `NotFoundError`, 409 a `SlotTakenError`, el 422 de horario no
 * disponible a `SlotUnavailableError`, cualquier otro 422 a `BookingStateError`; cualquier otro no-OK, o una falla
 * de red, a `ApiRequestError`.
 */
export class ClientBookingsRepository implements IClientBookingsRepository {
    constructor(
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {NotFoundError} el back respondió 404
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async getBookingByLink(link: string): Promise<ClientBooking> {
        return this.instrumentationService.startSpan({ name: 'ClientBookingsRepository > getBookingByLink', op: 'http.client' }, async () => {
            // El Enlace es una credencial: `what` llega a los mensajes de error y a los logs, así que va sin él.
            const what = 'GET /booking-links/:link';
            const body = await this.request(what, `/booking-links/${encodeURIComponent(link)}`, { method: 'GET' });
            return parseOrFail(() => clientBookingSchema.parse(body), what);
        });
    }

    /**
     * @throws {NotFoundError} el back respondió 404
     * @throws {BookingStateError} el back respondió 422
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async cancelBookingByLink(link: string): Promise<ClientBooking> {
        return this.instrumentationService.startSpan({ name: 'ClientBookingsRepository > cancelBookingByLink', op: 'http.client' }, async () => {
            const what = 'PATCH /booking-links/:link/cancel';
            const body = await this.request(what, `/booking-links/${encodeURIComponent(link)}/cancel`, { method: 'PATCH' });
            return parseOrFail(() => clientBookingSchema.parse(body), what);
        });
    }

    /**
     * @throws {NotFoundError} el back respondió 404
     * @throws {SlotTakenError} el back respondió 409
     * @throws {SlotUnavailableError} el back respondió 422 `Slot … is not available`: el horario ya no es reservable
     * @throws {BookingStateError} el back respondió cualquier otro 422
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async rescheduleBookingByLink(link: string, startsAt: string): Promise<ClientBooking> {
        return this.instrumentationService.startSpan(
            { name: 'ClientBookingsRepository > rescheduleBookingByLink', op: 'http.client' },
            async () => {
                const what = 'PATCH /booking-links/:link/reschedule';
                const body = await this.request(what, `/booking-links/${encodeURIComponent(link)}/reschedule`, {
                    method: 'PATCH',
                    body: { startsAt },
                });
                return parseOrFail(() => clientBookingSchema.parse(body), what);
            },
        );
    }

    private async request(what: string, path: string, { method, body }: { method: string; body?: unknown }) {
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 409) throw new SlotTakenError(message);
        if (response.status === 422 && SLOT_UNAVAILABLE_MESSAGE.test(message)) throw new SlotUnavailableError(message);
        if (response.status === 422) throw new BookingStateError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
