import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedSetHolidayCountrySchema, type SavedHolidaySettings } from '@/src/entities/models/holiday';

const settings = ({ countryCode, holidays, cancelledBookings }: SavedHolidaySettings) => ({
    countryCode,
    holidays: holidays.map(({ id, name, date, enabled }) => ({ id, name, date, enabled })),
    cancelledBookings,
});

function presenter(items: SavedHolidaySettings, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'setHolidayCountry Presenter', op: 'serialize' }, () => settings(items));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ISetHolidayCountryController = ReturnType<typeof setHolidayCountryController>;

/**
 * Cambia el país de los Días festivos del Usuario con Sesión (`null` lo saca) y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el código de país no es texto ni `null`, o los ids de Turnos no son válidos
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {InputParseError} el código de país es desconocido
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const setHolidayCountryController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        setHolidayCountryUseCase: ISetHolidayCountryUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'setHolidayCountry Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedSetHolidayCountrySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid setHolidayCountry', { cause: error });
            return presenter(await setHolidayCountryUseCase(data), instrumentationService);
        });
