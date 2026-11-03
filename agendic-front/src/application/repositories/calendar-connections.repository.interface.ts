import type { CalendarConnection, GoogleAuthorization } from '@/src/entities/models/calendar-connection';

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
    startGoogleConnection(): Promise<GoogleAuthorization>;

    /**
     * Desconecta el Calendario conectado del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Usuario no tiene un Calendario conectado (404)
     */
    disconnect(): Promise<void>;
}
