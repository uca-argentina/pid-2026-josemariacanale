import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CalendarConnection } from '@/src/entities/models/calendar-connection';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetCalendarConnectionUseCase = ReturnType<typeof getCalendarConnectionUseCase>;

/**
 * Busca el Calendario conectado del Usuario con Sesión; `null` si no conectó ninguno.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const getCalendarConnectionUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (): Promise<CalendarConnection | null> =>
        instrumentationService.startSpan({ name: 'getCalendarConnection Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.getConnection(),
        );
