import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ToggleHoliday, HolidaySettings } from '@/src/entities/models/holiday';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IToggleHolidayUseCase = ReturnType<typeof toggleHolidayUseCase>;

/**
 * Prende o apaga un Día festivo del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {NotFoundError} el Día festivo no existe
 */
export const toggleHolidayUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (input: ToggleHoliday): Promise<HolidaySettings> =>
        instrumentationService.startSpan({ name: 'toggleHoliday Use Case', op: 'function' }, () =>
            holidaysRepository.setEnabled(input),
        );
