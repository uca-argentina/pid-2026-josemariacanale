import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IDisconnectCalendarUseCase = ReturnType<typeof disconnectCalendarUseCase>;

/**
 * Desconecta el Calendario conectado del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 */
export const disconnectCalendarUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (): Promise<void> =>
        instrumentationService.startSpan({ name: 'disconnectCalendar Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.disconnect(),
        );
