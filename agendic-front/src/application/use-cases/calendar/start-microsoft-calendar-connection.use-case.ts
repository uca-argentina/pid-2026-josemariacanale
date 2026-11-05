import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CalendarAuthorization } from '@/src/entities/models/calendar-connection';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IStartMicrosoftCalendarConnectionUseCase = ReturnType<typeof startMicrosoftCalendarConnectionUseCase>;

/**
 * Empieza a conectar la cuenta de Microsoft (Outlook o Microsoft 365) del Usuario con Sesión como su Calendario conectado.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado
 * @throws {CalendarNotConfiguredError} el back no tiene configurado Microsoft
 */
export const startMicrosoftCalendarConnectionUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (): Promise<CalendarAuthorization> =>
        instrumentationService.startSpan({ name: 'startMicrosoftCalendarConnection Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.startMicrosoftConnection(),
        );
