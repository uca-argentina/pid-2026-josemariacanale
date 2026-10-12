import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SetHolidayCountry, HolidaySettings } from '@/src/entities/models/holiday';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ISetHolidayCountryUseCase = ReturnType<typeof setHolidayCountryUseCase>;

/**
 * Cambia el país de los Días festivos del Usuario con Sesión (`null` lo saca).
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {InputParseError} el código de país es desconocido
 */
export const setHolidayCountryUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (input: SetHolidayCountry): Promise<HolidaySettings> =>
        instrumentationService.startSpan({ name: 'setHolidayCountry Use Case', op: 'function' }, () =>
            holidaysRepository.setCountry(input),
        );
