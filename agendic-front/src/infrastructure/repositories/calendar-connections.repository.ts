import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import {
    CalendarAlreadyConnectedError,
    CalendarDisconnectedError,
    CalendarNotConfiguredError,
    CalendarNotInAccountError,
    CalendarsUnavailableError,
} from '@/src/entities/errors/calendar';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import {
    accountCalendarsSchema,
    googleAuthorizationSchema,
    myCalendarSchema,
    type AccountCalendar,
    type CalendarConnection,
    type GoogleAuthorization,
} from '@/src/entities/models/calendar-connection';
import { apiRequest, type ErrorByStatus } from './api-request';

/** Lo que `GET` y `PUT /users/me/calendar/calendars` responden igual: sin conexión, `DISCONNECTED` o Google caído. */
const CALENDARS_ERRORS: ErrorByStatus = { 404: NotFoundError, 409: CalendarDisconnectedError, 502: CalendarsUnavailableError };

function parseCalendars(method: string, path: string, json: unknown): AccountCalendar[] {
    try {
        return accountCalendarsSchema.parse(json).calendars;
    } catch (cause) {
        throw new ApiRequestError(`${method} ${path} responded with an unexpected body`, { cause });
    }
}

/**
 * Calendario conectado del Usuario contra la API del back.
 *
 * 401 se traduce a `UnauthenticatedError`, 404 a `NotFoundError`, 409 a `CalendarAlreadyConnectedError` (al conectar) o
 * `CalendarDisconnectedError` (al leer o guardar los calendarios), 422 a `CalendarNotInAccountError`, 502 a
 * `CalendarsUnavailableError` y 503 a `CalendarNotConfiguredError`; cualquier otro no-OK, una falla de red o un cuerpo
 * inesperado, a `ApiRequestError`.
 */
export class CalendarConnectionsRepository implements ICalendarConnectionsRepository {
    constructor(
        private readonly authenticationService: IAuthenticationService,
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async getConnection(): Promise<CalendarConnection | null> {
        return this.instrumentationService.startSpan({ name: 'CalendarConnectionsRepository > getConnection', op: 'http.client' }, async () => {
            const path = '/users/me/calendar';
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path);
            try {
                return myCalendarSchema.parse(json).connection;
            } catch (cause) {
                throw new ApiRequestError(`GET ${path} responded with an unexpected body`, { cause });
            }
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {CalendarAlreadyConnectedError} la API respondió 409
     * @throws {CalendarNotConfiguredError} la API respondió 503
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async startGoogleConnection(): Promise<GoogleAuthorization> {
        return this.instrumentationService.startSpan(
            { name: 'CalendarConnectionsRepository > startGoogleConnection', op: 'http.client' },
            async () => {
                const path = '/users/me/calendar/google';
                const json = await apiRequest(this.authenticationService, this.apiUrl, 'POST', path, {
                    errors: { 409: CalendarAlreadyConnectedError, 503: CalendarNotConfiguredError },
                });
                try {
                    return googleAuthorizationSchema.parse(json);
                } catch (cause) {
                    throw new ApiRequestError(`POST ${path} responded with an unexpected body`, { cause });
                }
            },
        );
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {ApiRequestError} falla de red u otro status no-OK
     */
    async disconnect(): Promise<void> {
        return this.instrumentationService.startSpan({ name: 'CalendarConnectionsRepository > disconnect', op: 'http.client' }, async () => {
            await apiRequest(this.authenticationService, this.apiUrl, 'DELETE', '/users/me/calendar', { errors: { 404: NotFoundError } });
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {CalendarDisconnectedError} la API respondió 409
     * @throws {CalendarsUnavailableError} la API respondió 502
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async listCalendars(): Promise<AccountCalendar[]> {
        return this.instrumentationService.startSpan({ name: 'CalendarConnectionsRepository > listCalendars', op: 'http.client' }, async () => {
            const path = '/users/me/calendar/calendars';
            const json = await apiRequest(this.authenticationService, this.apiUrl, 'GET', path, { errors: CALENDARS_ERRORS });
            return parseCalendars('GET', path, json);
        });
    }

    /**
     * @throws {UnauthenticatedError} la API respondió 401
     * @throws {NotFoundError} la API respondió 404
     * @throws {CalendarDisconnectedError} la API respondió 409
     * @throws {CalendarNotInAccountError} la API respondió 422
     * @throws {CalendarsUnavailableError} la API respondió 502
     * @throws {ApiRequestError} falla de red, otro status no-OK o cuerpo inesperado
     */
    async setCheckedCalendars(checkedIds: string[]): Promise<AccountCalendar[]> {
        return this.instrumentationService.startSpan(
            { name: 'CalendarConnectionsRepository > setCheckedCalendars', op: 'http.client' },
            async () => {
                const path = '/users/me/calendar/calendars';
                const json = await apiRequest(this.authenticationService, this.apiUrl, 'PUT', path, {
                    body: { checkedIds },
                    errors: { ...CALENDARS_ERRORS, 422: CalendarNotInAccountError },
                });
                return parseCalendars('PUT', path, json);
            },
        );
    }
}
