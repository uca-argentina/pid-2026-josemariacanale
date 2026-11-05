import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import {
    BookingNotAllowedError,
    BookingStateError,
    CANCELLATION_REASON_TOO_LONG_MESSAGE,
    CancellationReasonTooLongError,
    SLOT_UNAVAILABLE_MESSAGE,
    SlotTakenError,
    SlotUnavailableError,
} from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import {
    PRIZE_EXPIRED_MESSAGE,
    PRIZE_OF_ANOTHER_CLIENT_MESSAGE,
    PrizeAlreadyRedeemedError,
    PrizeExpiredError,
    PrizeOfAnotherClientError,
} from '@/src/entities/errors/streak';
import { bookingHistorySchema, type BookingHistoryEntry } from '@/src/entities/models/booking-history';
import { bookingStreakSchema, redeemedPrizeSchema, type BookingStreak, type RedeemedPrize } from '@/src/entities/models/booking-streak';
import { userBookingSchema, type UserBooking } from '@/src/entities/models/user-booking';

/** Los errores de Canjear que no son los de las demás acciones sobre un Turno: el 409 no es un horario ocupado. */
const redeemFailure = (status: number, message: string): Error | undefined => {
    if (status === 409) return new PrizeAlreadyRedeemedError(message);
    if (status === 422 && PRIZE_EXPIRED_MESSAGE.test(message)) return new PrizeExpiredError(message);
    if (status === 422 && PRIZE_OF_ANOTHER_CLIENT_MESSAGE.test(message)) return new PrizeOfAnotherClientError(message);
    return undefined;
};

/** El body de Cancelar o Rechazar: el Motivo de cancelación si hay, si no ninguno. */
const reasonBody = (reason?: string) => (reason === undefined ? undefined : { reason });

/** El body de una acción sobre la Serie (#305): `flag` (`series` o `andFollowing`) va solo cuando se pide. */
const seriesBody = (flag: 'series' | 'andFollowing', on: boolean, reason?: string) =>
    on ? { ...reasonBody(reason), [flag]: true } : reasonBody(reason);

/**
 * Turnos que atiende el Usuario contra la API del back.
 *
 * Cada método traduce el status del back así: el 400 de un Motivo de cancelación muy largo a
 * `CancellationReasonTooLongError`, 401 a `UnauthenticatedError`, 403 a
 * `BookingNotAllowedError`, 404 a `NotFoundError`, 409 a `SlotTakenError`, 422 a `BookingStateError` (al Canjear un Premio, 409 a
 * `PrizeAlreadyRedeemedError` y los 422 de Premio a `PrizeExpiredError` y `PrizeOfAnotherClientError`);
 * cualquier otro no-OK, o una falla de red, a `ApiRequestError`.
 */
export class UserBookingsRepository implements IUserBookingsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listMyBookings(): Promise<UserBooking[]> {
        const json = await this.request('GET', '/users/me/bookings');
        try {
            return userBookingSchema.array().parse(json);
        } catch (cause) {
            throw new ApiRequestError('GET /users/me/bookings responded with an unexpected body', { cause });
        }
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async accept(bookingId: number, series = false): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/accept`, seriesBody('series', series));
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {CancellationReasonTooLongError} la API respondió 400 `reason is too long`
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async reject(bookingId: number, reason?: string, series = false): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/reject`, seriesBody('series', series, reason));
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {CancellationReasonTooLongError} la API respondió 400 `reason is too long`
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async cancel(bookingId: number, reason?: string, andFollowing = false): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/cancel`, seriesBody('andFollowing', andFollowing, reason));
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {SlotTakenError} la API respondió 409
     * @throws {SlotUnavailableError} la API respondió 422 `Slot … is not available`: el horario ya no es reservable
     * @throws {BookingStateError} la API respondió cualquier otro 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async reschedule(bookingId: number, startsAt: string): Promise<{ id: number }> {
        const json = await this.request('PATCH', `/bookings/${bookingId}/reschedule`, { startsAt });
        if (typeof json?.id !== 'number') throw new ApiRequestError(`PATCH /bookings/${bookingId}/reschedule responded without a numeric Turno id: ${JSON.stringify(json)}`);
        return { id: json.id };
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getHistory(bookingId: number): Promise<BookingHistoryEntry[]> {
        const json = await this.request('GET', `/bookings/${bookingId}/history`);
        try {
            return bookingHistorySchema.parse(json).entries;
        } catch (cause) {
            throw new ApiRequestError('GET /bookings/:id/history responded with an unexpected body', { cause });
        }
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async markNoShow(bookingId: number): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/no-show`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async unmarkNoShow(bookingId: number): Promise<void> {
        await this.request('DELETE', `/bookings/${bookingId}/no-show`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getStreak(bookingId: number): Promise<BookingStreak> {
        const json = await this.request('GET', `/bookings/${bookingId}/streak`);
        try {
            return bookingStreakSchema.parse(json);
        } catch (cause) {
            throw new ApiRequestError('GET /bookings/:id/streak responded with an unexpected body', { cause });
        }
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {PrizeAlreadyRedeemedError} la API respondió 409
     * @throws {PrizeExpiredError} la API respondió 422 `Prize <id> expired`
     * @throws {PrizeOfAnotherClientError} la API respondió 422 `Prize <id> belongs to another Ficha del Cliente`
     * @throws {BookingStateError} la API respondió cualquier otro 422
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async redeemPrize(bookingId: number, prizeId: number): Promise<RedeemedPrize> {
        const json = await this.request('PATCH', `/bookings/${bookingId}/redeem-prize`, { prizeId }, redeemFailure);
        try {
            return redeemedPrizeSchema.parse(json);
        } catch (cause) {
            throw new ApiRequestError('PATCH /bookings/:id/redeem-prize responded with an unexpected body', { cause });
        }
    }

    private async request(method: string, path: string, body?: unknown, translate?: (status: number, message: string) => Error | undefined) {
        const what = `${method} ${path}`;
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body !== undefined && { 'Content-Type': 'application/json' }),
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        const translated = translate?.(response.status, message);
        if (translated) throw translated;
        if (response.status === 400 && message === CANCELLATION_REASON_TOO_LONG_MESSAGE) throw new CancellationReasonTooLongError(message);
        if (response.status === 401) throw new UnauthenticatedError(message);
        if (response.status === 403) throw new BookingNotAllowedError(message);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 409) throw new SlotTakenError(message);
        if (response.status === 422 && SLOT_UNAVAILABLE_MESSAGE.test(message)) throw new SlotUnavailableError(message);
        if (response.status === 422) throw new BookingStateError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
