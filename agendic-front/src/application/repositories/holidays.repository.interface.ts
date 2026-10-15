import type {
    ConfirmedSetHolidayCountry,
    ConfirmedToggleHoliday,
    HolidayConflict,
    HolidayCountry,
    HolidaySettings,
    SavedHolidaySettings,
    SetHolidayCountry,
    ToggleHoliday,
} from '@/src/entities/models/holiday';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Días festivos del Usuario con Sesión contra la API del back. */
export interface IHolidaysRepository {
    /**
     * Los calendarios religiosos primero y los países después.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     */
    listCountries(): Promise<HolidayCountry[]>;

    /**
     * El país del Usuario y sus Días festivos por fecha.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     */
    getSettings(): Promise<HolidaySettings>;

    /**
     * Los Turnos que cambiar el país del Usuario dejaría afuera. No guarda nada.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {InputParseError} el código de país es desconocido (400)
     */
    previewSetCountry(input: SetHolidayCountry): Promise<LeftOutsideBooking[]>;

    /**
     * Cambia el país del Usuario (`null` lo saca), prende todos sus Días festivos y cancela los Turnos que confirmó.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {InputParseError} el código de país es desconocido (400)
     * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera (409)
     */
    setCountry(input: ConfirmedSetHolidayCountry): Promise<SavedHolidaySettings>;

    /**
     * Los Turnos que prender o apagar un Día festivo del Usuario dejaría afuera. No guarda nada.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {NotFoundError} el Día festivo no existe (404)
     */
    previewSetEnabled(input: ToggleHoliday): Promise<LeftOutsideBooking[]>;

    /**
     * Prende o apaga un Día festivo del Usuario y cancela los Turnos que confirmó.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {NotFoundError} el Día festivo no existe (404)
     * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera (409)
     */
    setEnabled(input: ConfirmedToggleHoliday): Promise<SavedHolidaySettings>;

    /**
     * Los Turnos tomados en Días festivos prendidos, por fecha del Día festivo.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     */
    listConflicts(): Promise<HolidayConflict[]>;
}
