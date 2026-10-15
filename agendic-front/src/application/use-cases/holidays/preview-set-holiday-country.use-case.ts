import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SetHolidayCountry } from '@/src/entities/models/holiday';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewSetHolidayCountryUseCase = ReturnType<typeof previewSetHolidayCountryUseCase>;

/**
 * Los Turnos que cambiar el país de los Días festivos del Usuario dejaría afuera. No guarda nada.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {InputParseError} el código de país es desconocido
 */
export const previewSetHolidayCountryUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (input: SetHolidayCountry): Promise<LeftOutsideBooking[]> =>
        instrumentationService.startSpan({ name: 'previewSetHolidayCountry Use Case', op: 'function' }, () =>
            holidaysRepository.previewSetCountry(input),
        );
