import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IStartMicrosoftCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-microsoft-calendar-connection.use-case';
import type { CalendarAuthorization } from '@/src/entities/models/calendar-connection';

function presenter(authorization: CalendarAuthorization, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'startMicrosoftCalendarConnection Presenter', op: 'serialize' }, () => ({
        authorizationUrl: authorization.authorizationUrl,
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IStartMicrosoftCalendarConnectionController = ReturnType<typeof startMicrosoftCalendarConnectionController>;

/**
 * Empieza a conectar la cuenta de Microsoft del Usuario con Sesión y devuelve a dónde llevar el navegador.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {CalendarAlreadyConnectedError} el Usuario ya tiene un Calendario conectado
 * @throws {CalendarNotConfiguredError} el back no tiene configurado Microsoft
 */
export const startMicrosoftCalendarConnectionController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        startMicrosoftCalendarConnectionUseCase: IStartMicrosoftCalendarConnectionUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'startMicrosoftCalendarConnection Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await startMicrosoftCalendarConnectionUseCase(), instrumentationService);
        });
