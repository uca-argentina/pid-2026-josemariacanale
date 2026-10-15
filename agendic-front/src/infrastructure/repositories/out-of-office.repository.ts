import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import {
    LEFT_OUTSIDE_BOOKINGS_CHANGED_MESSAGE,
    LeftOutsideBookingsChangedError,
    OutOfOfficeConflictError,
    OutOfOfficeRuleError,
} from '@/src/entities/errors/out-of-office';
import {
    cancelledBookingsSchema,
    leftOutsideBookingSchema,
    type CancelledBookings,
    type LeftOutsideBooking,
} from '@/src/entities/models/left-outside-booking';
import {
    outOfOfficeSchema,
    type ConfirmedOutOfOffice,
    type ConfirmedUpdateOutOfOffice,
    type OutOfOffice,
    type SaveOutOfOffice,
    type UpdateOutOfOffice,
} from '@/src/entities/models/out-of-office';
import { apiRequest } from './api-request';

/**
 * Períodos Fuera de la oficina del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 404 a `NotFoundError`, 422 a `OutOfOfficeRuleError` y 409 a
 * `OutOfOfficeConflictError`, salvo el 409 de Turnos que quedan afuera (mensaje exacto del back), que es
 * `LeftOutsideBookingsChangedError`; cualquier otro no-OK, una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class OutOfOfficeRepository implements IOutOfOfficeRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listOutOfOffice(): Promise<OutOfOffice[]> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > listOutOfOffice', op: 'http.client' }, async () => {
            const path = '/users/me/out-of-office';
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path);
            try {
                return outOfOfficeSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {OutOfOfficeRuleError} la API respondió 422
     * @throws {OutOfOfficeConflictError} la API respondió 409
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async previewOutOfOffice(input: SaveOutOfOffice): Promise<LeftOutsideBooking[]> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > previewOutOfOffice', op: 'http.client' }, async () => {
            const path = '/users/me/out-of-office/preview';
            const json = await this.write('POST', path, input);
            try {
                return leftOutsideBookingSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError(`POST ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {OutOfOfficeRuleError} la API respondió 422
     * @throws {OutOfOfficeConflictError} la API respondió 409 por fechas repetidas
     * @throws {LeftOutsideBookingsChangedError} la API respondió 409 por Turnos que quedan afuera
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async createOutOfOffice(input: ConfirmedOutOfOffice): Promise<CancelledBookings> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > createOutOfOffice', op: 'http.client' }, async () => {
            const path = '/users/me/out-of-office';
            const json = await this.write('POST', path, input);
            try {
                return cancelledBookingsSchema.parse(json);
            } catch (cause) {
                throw new ApiRequestError(`POST ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {OutOfOfficeRuleError} la API respondió 422
     * @throws {OutOfOfficeConflictError} la API respondió 409
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async previewUpdateOutOfOffice({ outOfOfficeId, ...body }: UpdateOutOfOffice): Promise<LeftOutsideBooking[]> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > previewUpdateOutOfOffice', op: 'http.client' }, async () => {
            const path = `/users/me/out-of-office/${outOfOfficeId}/preview`;
            const json = await this.write('POST', path, body);
            try {
                return leftOutsideBookingSchema.array().parse(json);
            } catch (cause) {
                throw new ApiRequestError(`POST ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {OutOfOfficeRuleError} la API respondió 422
     * @throws {OutOfOfficeConflictError} la API respondió 409 por fechas repetidas
     * @throws {LeftOutsideBookingsChangedError} la API respondió 409 por Turnos que quedan afuera
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async updateOutOfOffice({ outOfOfficeId, ...body }: ConfirmedUpdateOutOfOffice): Promise<CancelledBookings> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > updateOutOfOffice', op: 'http.client' }, async () => {
            const path = `/users/me/out-of-office/${outOfOfficeId}`;
            const json = await this.write('PUT', path, body);
            try {
                return cancelledBookingsSchema.parse(json);
            } catch (cause) {
                throw new ApiRequestError(`PUT ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async deleteOutOfOffice(outOfOfficeId: number): Promise<void> {
        return this.instrumentationService.startSpan({ name: 'OutOfOfficeRepository > deleteOutOfOffice', op: 'http.client' }, async () => {
            await this.write('DELETE', `/users/me/out-of-office/${outOfOfficeId}`);
        });
    }

    /** Hay dos 409 en el mismo endpoint: se distinguen por el mensaje exacto del back. */
    private async write(method: string, path: string, body?: unknown) {
        try {
            return await apiRequest(this.authenticationService, this.apiUrl, method, path, {
                body,
                errors: { 404: NotFoundError, 409: OutOfOfficeConflictError, 422: OutOfOfficeRuleError },
            });
        } catch (error) {
            if (error instanceof OutOfOfficeConflictError && error.message === LEFT_OUTSIDE_BOOKINGS_CHANGED_MESSAGE) {
                throw new LeftOutsideBookingsChangedError(error.message, { cause: error });
            }
            throw error;
        }
    }
}
