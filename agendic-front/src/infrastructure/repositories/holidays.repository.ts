import type { z } from 'zod';
import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';
import {
    holidayConflictSchema,
    holidayCountrySchema,
    holidaySettingsSchema,
    savedHolidaySettingsSchema,
    type ConfirmedSetHolidayCountry,
    type ConfirmedToggleHoliday,
    type HolidayConflict,
    type HolidayCountry,
    type HolidaySettings,
    type SavedHolidaySettings,
    type SetHolidayCountry,
    type ToggleHoliday,
} from '@/src/entities/models/holiday';
import { leftOutsideBookingSchema, type LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import { apiRequest } from './api-request';

/**
 * Días festivos del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 400 a `InputParseError`, 404 a `NotFoundError`, 409 (cambió la lista de
 * Turnos que quedan afuera) a `LeftOutsideBookingsChangedError` y 503 a `HolidaysNotConfiguredError`; cualquier otro no-OK, una falla de red o un cuerpo inesperado, a `ApiRequestError`.
 */
export class HolidaysRepository implements IHolidaysRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listCountries(): Promise<HolidayCountry[]> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > listCountries', op: 'http.client' }, () =>
            this.request('GET', '/holidays/countries', holidayCountrySchema.array()),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getSettings(): Promise<HolidaySettings> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > getSettings', op: 'http.client' }, () =>
            this.request('GET', '/users/me/holidays', holidaySettingsSchema),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async previewSetCountry(input: SetHolidayCountry): Promise<LeftOutsideBooking[]> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > previewSetCountry', op: 'http.client' }, () =>
            this.request('POST', '/users/me/holidays/preview', leftOutsideBookingSchema.array(), input),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {LeftOutsideBookingsChangedError} la API respondió 409
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async setCountry(input: ConfirmedSetHolidayCountry): Promise<SavedHolidaySettings> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > setCountry', op: 'http.client' }, () =>
            this.request('PUT', '/users/me/holidays', savedHolidaySettingsSchema, input),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {NotFoundError} la API respondió 404
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async previewSetEnabled({ holidayId, enabled }: ToggleHoliday): Promise<LeftOutsideBooking[]> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > previewSetEnabled', op: 'http.client' }, () =>
            this.request('POST', `/users/me/holidays/${encodeURIComponent(holidayId)}/preview`, leftOutsideBookingSchema.array(), { enabled }),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {InputParseError} la API respondió 400
     * @throws {NotFoundError} la API respondió 404
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {LeftOutsideBookingsChangedError} la API respondió 409
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async setEnabled({ holidayId, ...body }: ConfirmedToggleHoliday): Promise<SavedHolidaySettings> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > setEnabled', op: 'http.client' }, () =>
            this.request('PATCH', `/users/me/holidays/${encodeURIComponent(holidayId)}`, savedHolidaySettingsSchema, body),
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {HolidaysNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listConflicts(): Promise<HolidayConflict[]> {
        return this.instrumentationService.startSpan({ name: 'HolidaysRepository > listConflicts', op: 'http.client' }, () =>
            this.request('GET', '/users/me/holidays/conflicts', holidayConflictSchema.array()),
        );
    }

    private async request<T extends z.ZodType>(method: string, path: string, schema: T, body?: unknown): Promise<z.infer<T>> {
        const json = await apiRequest(this.authenticationService, this.apiUrl, method, path, {
            body,
            errors: { 400: InputParseError, 404: NotFoundError, 409: LeftOutsideBookingsChangedError, 503: HolidaysNotConfiguredError },
        });
        try {
            return schema.parse(json);
        } catch (cause) {
            throw new ApiRequestError(`${method} ${path} responded with an unexpected body`, { cause });
        }
    }
}
