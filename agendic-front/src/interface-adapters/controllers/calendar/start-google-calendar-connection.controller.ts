import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IStartGoogleCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-google-calendar-connection.use-case';
import type { CalendarAuthorization } from '@/src/entities/models/calendar-connection';

function presenter(authorization: CalendarAuthorization, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'startGoogleCalendarConnection Presenter', op: 'serialize' }, () => ({
        authorizationUrl: authorization.authorizationUrl,
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IStartGoogleCalendarConnectionController = ReturnType<typeof startGoogleCalendarConnectionController>;

/**
 * Empieza a conectar la cuenta de Google del Usuario con Sesión y devuelve a dónde llevar el navegador.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado
 * @throws {CalendarNotConfiguredError} el back no tiene configurado Google
 */
export const startGoogleCalendarConnectionController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        startGoogleCalendarConnectionUseCase: IStartGoogleCalendarConnectionUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'startGoogleCalendarConnection Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await startGoogleCalendarConnectionUseCase(), instrumentationService);
        });
