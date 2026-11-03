import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/get-calendar-connection.use-case';
import type { CalendarConnection } from '@/src/entities/models/calendar-connection';

function presenter(connection: CalendarConnection | null, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan(
        { name: 'getMyCalendarConnection Presenter', op: 'serialize' },
        () =>
            connection && {
                provider: connection.provider,
                email: connection.email,
                status: connection.status,
                connectedAt: connection.connectedAt,
            },
    );
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetMyCalendarConnectionController = ReturnType<typeof getMyCalendarConnectionController>;

/**
 * El Calendario conectado del Usuario con Sesión; `null` si no conectó ninguno.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const getMyCalendarConnectionController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getCalendarConnectionUseCase: IGetCalendarConnectionUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getMyCalendarConnection Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await getCalendarConnectionUseCase(), instrumentationService);
        });
