import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { BookingNotAllowedError, BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { employeeBookingSchema, type EmployeeBooking } from '@/src/entities/models/employee-booking';

/**
 * Turnos del Empleado contra la API del back.
 *
 * Cada método traduce el status del back así: 401 a `UnauthenticatedError`, 403 a
 * `BookingNotAllowedError`, 404 a `NotFoundError`, 409 a `SlotTakenError`, 422 a `BookingStateError`;
 * cualquier otro no-OK, o una falla de red, a `ApiRequestError`.
 */
export class EmployeeBookingsRepository implements IEmployeeBookingsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listMyBookings(): Promise<EmployeeBooking[]> {
        const json = await this.request('GET', '/employees/me/bookings');
        try {
            return employeeBookingSchema.array().parse(json);
        } catch (cause) {
            throw new ApiRequestError('GET /employees/me/bookings responded with an unexpected body', { cause });
        }
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async accept(bookingId: number): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/accept`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async reject(bookingId: number): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/reject`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async cancel(bookingId: number): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/cancel`);
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {BookingNotAllowedError} la API respondió 403
     * @throws {NotFoundError} la API respondió 404
     * @throws {SlotTakenError} la API respondió 409
     * @throws {BookingStateError} la API respondió 422
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async reschedule(bookingId: number, startsAt: string): Promise<void> {
        await this.request('PATCH', `/bookings/${bookingId}/reschedule`, { startsAt });
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

    private async request(method: string, path: string, body?: unknown) {
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
        if (response.status === 401) throw new UnauthenticatedError(message);
        if (response.status === 403) throw new BookingNotAllowedError(message);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 409) throw new SlotTakenError(message);
        if (response.status === 422) throw new BookingStateError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        return json;
    }
}
