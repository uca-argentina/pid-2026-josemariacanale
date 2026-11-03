import type { ICalendarConnectionsRepository } from '@/src/application/repositories/calendar-connections.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { GoogleAuthorization } from '@/src/entities/models/calendar-connection';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IStartGoogleCalendarConnectionUseCase = ReturnType<typeof startGoogleCalendarConnectionUseCase>;

/**
 * Empieza a conectar la cuenta de Google del Usuario con Sesión como su Calendario conectado.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado
 * @throws {CalendarNotConfiguredError} el back no tiene configurado Google
 */
export const startGoogleCalendarConnectionUseCase =
    (instrumentationService: IInstrumentationService, calendarConnectionsRepository: ICalendarConnectionsRepository) =>
    (): Promise<GoogleAuthorization> =>
        instrumentationService.startSpan({ name: 'startGoogleCalendarConnection Use Case', op: 'function' }, () =>
            calendarConnectionsRepository.startGoogleConnection(),
        );
