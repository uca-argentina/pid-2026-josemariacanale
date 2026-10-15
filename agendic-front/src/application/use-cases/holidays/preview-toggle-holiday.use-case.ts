import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ToggleHoliday } from '@/src/entities/models/holiday';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewToggleHolidayUseCase = ReturnType<typeof previewToggleHolidayUseCase>;

/**
 * Los Turnos que prender o apagar un Día festivo del Usuario dejaría afuera. No guarda nada.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {NotFoundError} el Día festivo no existe
 */
export const previewToggleHolidayUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (input: ToggleHoliday): Promise<LeftOutsideBooking[]> =>
        instrumentationService.startSpan({ name: 'previewToggleHoliday Use Case', op: 'function' }, () =>
            holidaysRepository.previewSetEnabled(input),
        );
