import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { AccountCalendar } from '@/src/entities/models/calendar-connection';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListAccountCalendarsUseCase = ReturnType<typeof listAccountCalendarsUseCase>;

/**
 * Lista los calendarios de la cuenta de Google conectada del Usuario con Sesión y cuáles cuentan como Ocupado externo.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED`
 * @throws {CalendarsUnavailableError} Google no respondió
 */
export const listAccountCalendarsUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (): Promise<AccountCalendar[]> =>
        instrumentationService.startSpan({ name: 'listAccountCalendars Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.listCalendars(),
        );
