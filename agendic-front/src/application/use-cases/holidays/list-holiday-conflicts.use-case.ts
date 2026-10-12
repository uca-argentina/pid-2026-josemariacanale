import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { HolidayConflict } from '@/src/entities/models/holiday';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListHolidayConflictsUseCase = ReturnType<typeof listHolidayConflictsUseCase>;

/**
 * Lista los Turnos tomados en Días festivos prendidos del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const listHolidayConflictsUseCase =
    (instrumentationService: IInstrumentationService, holidaysRepository: IHolidaysRepository) =>
    (): Promise<HolidayConflict[]> =>
        instrumentationService.startSpan({ name: 'listHolidayConflicts Use Case', op: 'function' }, () =>
            holidaysRepository.listConflicts(),
        );
