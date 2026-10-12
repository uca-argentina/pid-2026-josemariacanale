import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { setHolidayCountrySchema, type HolidaySettings } from '@/src/entities/models/holiday';

const settings = ({ countryCode, holidays }: HolidaySettings) => ({
    countryCode,
    holidays: holidays.map(({ id, name, date, enabled }) => ({ id, name, date, enabled })),
});

function presenter(items: HolidaySettings, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'setHolidayCountry Presenter', op: 'serialize' }, () => settings(items));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ISetHolidayCountryController = ReturnType<typeof setHolidayCountryController>;

/**
 * Cambia el país de los Días festivos del Usuario con Sesión (`null` lo saca).
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el código de país no es texto ni `null`
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {InputParseError} el código de país es desconocido
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
            const { data, error } = setHolidayCountrySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid setHolidayCountry', { cause: error });
            return presenter(await setHolidayCountryUseCase(data), instrumentationService);
        });
