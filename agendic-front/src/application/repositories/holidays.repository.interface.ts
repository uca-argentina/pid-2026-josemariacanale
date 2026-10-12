import type {
    HolidayConflict,
    HolidayCountry,
    HolidaySettings,
    SetHolidayCountry,
    ToggleHoliday,
} from '@/src/entities/models/holiday';

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
     * Cambia el país del Usuario (`null` lo saca) y prende todos sus Días festivos.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {InputParseError} el código de país es desconocido (400)
     */
    setCountry(input: SetHolidayCountry): Promise<HolidaySettings>;

    /**
     * Prende o apaga un Día festivo del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     * @throws {NotFoundError} el Día festivo no existe (404)
     */
    setEnabled(input: ToggleHoliday): Promise<HolidaySettings>;

    /**
     * Los Turnos tomados en Días festivos prendidos, por fecha del Día festivo.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos (503)
     */
    listConflicts(): Promise<HolidayConflict[]>;
}
