import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { AccountCalendar } from '@/src/entities/models/calendar-connection';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ISetCheckedCalendarsUseCase = ReturnType<typeof setCheckedCalendarsUseCase>;

/**
 * Guarda cuáles calendarios de la cuenta conectada del Usuario con Sesión cuentan como Ocupado externo.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED`
 * @throws {CalendarNotInAccountError} algún id no es de la cuenta conectada
 * @throws {CalendarsUnavailableError} Google no respondió
 */
export const setCheckedCalendarsUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (checkedIds: string[]): Promise<AccountCalendar[]> =>
        instrumentationService.startSpan({ name: 'setCheckedCalendars Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.setCheckedCalendars(checkedIds),
        );
