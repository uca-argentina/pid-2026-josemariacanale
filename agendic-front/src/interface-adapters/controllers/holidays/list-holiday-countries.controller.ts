import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListHolidayCountriesUseCase } from '@/src/application/use-cases/holidays/list-holiday-countries.use-case';
import type { HolidayCountry } from '@/src/entities/models/holiday';

function presenter(items: HolidayCountry[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listHolidayCountries Presenter', op: 'serialize' }, () => items.map(({ code, name }) => ({ code, name })));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListHolidayCountriesController = ReturnType<typeof listHolidayCountriesController>;

/**
 * Lista los calendarios y países entre los que el Usuario con Sesión elige sus Días festivos.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const listHolidayCountriesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listHolidayCountriesUseCase: IListHolidayCountriesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listHolidayCountries Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listHolidayCountriesUseCase(), instrumentationService);
        });
