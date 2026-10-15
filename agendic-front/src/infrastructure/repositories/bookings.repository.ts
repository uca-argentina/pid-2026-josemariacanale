import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import {
    InvalidVerificationCodeError,
    SeriesDatesUnavailableError,
    SeriesTooShortError,
    SLOT_UNAVAILABLE_MESSAGE,
    SlotTakenError,
    SlotUnavailableError,
    TooManyVerificationCodeRequestsError,
} from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { bookingSchema, type Booking, type CreateBooking } from '@/src/entities/models/booking';
import { seriesSlotsSchema, slotsSchema, type SeriesSlots, type SeriesSlotsQuery, type Slots, type SlotsQuery } from '@/src/entities/models/slot';
import { seriesConflictDates } from './series-conflict';

/** Igual que en BusinessesRepository: el lint de límites impide que los adaptadores se importen entre sí. */
function parseOrFail<T>(parse: () => T, what: string): T {
    try {
        return parse();
    } catch (cause) {
        throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
    }
}

/** El 422 de una Serie que, sin las fechas salteadas, queda con menos de 2 Turnos (ADR 0007). */
const SERIES_TOO_SHORT_MESSAGE = 'A Serie needs at least 2 Turnos';

/** Los 400 de una Serie mal pedida (ADR 0007): bugs del front, no un Código de verificación inválido. */
const SERIES_BAD_REQUEST = /^(count must be between|skipDates are not dates of the Serie)/;

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
            if (query.employeeId !== undefined) params.set('employeeId', String(query.employeeId));
            const what = 'GET /services/:id/slots';
            const body = await this.request(`/services/${serviceId}/slots?${params}`, {}, what);
            return parseOrFail(() => slotsSchema.parse(body), what);
        });
    }

    /**
     * Las fechas de una Serie a partir de su primer horario (ADR 0032).
     *
     * @throws {NotFoundError} el back respondió 404: el Servicio ya no existe, o el Empleado elegido no lo atiende
     * @throws {SlotUnavailableError} el back respondió 422: el primer horario ya no es un Horario reservable
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async listSeriesSlots({ serviceId, startsAt, count, employeeId }: SeriesSlotsQuery): Promise<SeriesSlots> {
        return this.instrumentationService.startSpan({ name: 'BookingsRepository > listSeriesSlots', op: 'http.client' }, async () => {
            const params = new URLSearchParams({ startsAt, count: String(count) });
            if (employeeId !== undefined) params.set('employeeId', String(employeeId));
            const what = 'GET /services/:id/series-slots';
            const body = await this.request(`/services/${serviceId}/series-slots?${params}`, {}, what);
            return parseOrFail(() => seriesSlotsSchema.parse(body), what);
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
     * Reserva un Turno o, con `repeat`, una Serie (ADR 0032), que responde el primer Turno con todos los de la Serie.
     *
     * @throws {InvalidVerificationCodeError} el back respondió 400: el código no es válido para clientEmail, o venció
     * @throws {SeriesDatesUnavailableError} el back respondió el 409 de una Serie: esas fechas chocan
     * @throws {SeriesTooShortError} el back respondió 422: sin las fechas salteadas quedan menos de 2 Turnos
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
                if (error instanceof SlotTakenError) {
                    const dates = seriesConflictDates(error.message);
                    if (dates) throw new SeriesDatesUnavailableError(error.message, { dates, cause: error });
                }
                if (error instanceof ApiRequestError && error.status === 422 && error.message === SERIES_TOO_SHORT_MESSAGE)
                    throw new SeriesTooShortError(error.message, { cause: error });
                if (error instanceof ApiRequestError && error.status === 400 && !SERIES_BAD_REQUEST.test(error.message))
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
