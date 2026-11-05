import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDisconnectCalendarUseCase } from '@/src/application/use-cases/calendar/disconnect-calendar.use-case';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IDisconnectCalendarController = ReturnType<typeof disconnectCalendarController>;

/**
 * Desconecta el Calendario conectado del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 */
export const disconnectCalendarController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        disconnectCalendarUseCase: IDisconnectCalendarUseCase,
    ) =>
    async (): Promise<void> =>
        instrumentationService.startSpan({ name: 'disconnectCalendar Controller' }, async () => {
            await authenticationService.getCurrentUser();
            await disconnectCalendarUseCase();
        });
