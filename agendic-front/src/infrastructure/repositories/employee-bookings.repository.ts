import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';
import { employeeBookingSchema, type EmployeeBooking } from '@/src/entities/models/employee-booking';

/** Turnos del Empleado contra la API del back. */
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
        const what = 'GET /employees/me/bookings';
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
        const token = await this.authenticationService.getAccessToken();

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}/employees/me/bookings`, { headers: { Authorization: `Bearer ${token}` } });
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 401) throw new UnauthenticatedError(message);
        if (!response.ok) throw new ApiRequestError(message, { status: response.status });
        try {
            return employeeBookingSchema.array().parse(json);
        } catch (cause) {
            throw new ApiRequestError(`${what} responded with an unexpected body`, { cause });
        }
    }
}
