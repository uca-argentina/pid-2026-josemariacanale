import type { AccountCalendar, CalendarConnection, CalendarAuthorization } from '@/src/entities/models/calendar-connection';

/** Calendario conectado del Usuario con Sesión contra la API del back. */
export interface ICalendarConnectionsRepository {
    /**
     * El Calendario conectado del Usuario, o `null` si no conectó ninguno.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    getConnection(): Promise<CalendarConnection | null>;

    /**
     * Empieza a conectar la cuenta de Google del Usuario. No conecta nada hasta que Google vuelve al back.
     *
     * @returns la dirección de Google a la que llevar el navegador
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado (409)
     * @throws {CalendarNotConfiguredError} el back no tiene configurado Google (503)
     */
    startGoogleConnection(): Promise<CalendarAuthorization>;

    /**
     * Empieza a conectar la cuenta de Microsoft (Outlook o Microsoft 365) del Usuario. No conecta nada hasta que
     * Microsoft vuelve al back.
     *
     * @returns la dirección de Microsoft a la que llevar el navegador
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado, de cualquier proveedor (409)
     * @throws {CalendarNotConfiguredError} el back no tiene configurado Microsoft (503)
     */
    startMicrosoftConnection(): Promise<CalendarAuthorization>;

    /**
     * Desconecta el Calendario conectado del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Usuario no tiene un Calendario conectado (404)
     */
    disconnect(): Promise<void>;

    /**
     * Los calendarios de la cuenta conectada, el principal primero, con cuáles cuentan como Ocupado externo.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Usuario no tiene un Calendario conectado (404)
     * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED` (409)
     * @throws {CalendarsUnavailableError} el proveedor no respondió (502)
     */
    listCalendars(): Promise<AccountCalendar[]>;

    /**
     * Guarda cuáles calendarios cuentan como Ocupado externo; una lista vacía vale.
     *
     * @returns los calendarios de la cuenta como quedaron
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Usuario no tiene un Calendario conectado (404)
     * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED` (409)
     * @throws {CalendarNotInAccountError} algún id no es de la cuenta conectada (422)
     * @throws {CalendarsUnavailableError} el proveedor no respondió (502)
     */
    setCheckedCalendars(checkedIds: string[]): Promise<AccountCalendar[]>;
}
