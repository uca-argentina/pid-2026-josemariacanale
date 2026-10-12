import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { HolidayCountry } from '@/src/entities/models/holiday';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListHolidayCountriesUseCase = ReturnType<typeof listHolidayCountriesUseCase>;

/**
 * Lista los calendarios y países entre los que el Usuario con Sesión elige sus Días festivos.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const listHolidayCountriesUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (): Promise<HolidayCountry[]> =>
        instrumentationService.startSpan({ name: 'listHolidayCountries Use Case', op: 'function' }, () =>
            holidaysRepository.listCountries(),
        );
