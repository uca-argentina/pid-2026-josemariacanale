import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { HolidaySettings } from '@/src/entities/models/holiday';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetMyHolidaysUseCase = ReturnType<typeof getMyHolidaysUseCase>;

/**
 * Devuelve el país del Usuario con Sesión y sus Días festivos.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const getMyHolidaysUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (): Promise<HolidaySettings> =>
        instrumentationService.startSpan({ name: 'getMyHolidays Use Case', op: 'function' }, () =>
            holidaysRepository.getSettings(),
        );
