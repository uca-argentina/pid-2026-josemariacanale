import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListAccountCalendarsUseCase } from '@/src/application/use-cases/calendar/list-account-calendars.use-case';
import { accountCalendarsPresenter } from '@/src/interface-adapters/presenters/account-calendars.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListAccountCalendarsController = ReturnType<typeof listAccountCalendarsController>;

/**
 * Los calendarios de la cuenta conectada del Usuario con Sesión y cuáles cuentan como Ocupado externo.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED`
 * @throws {CalendarsUnavailableError} Google no respondió
 */
export const listAccountCalendarsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listAccountCalendarsUseCase: IListAccountCalendarsUseCase,
    ) =>
    async (): Promise<ReturnType<typeof accountCalendarsPresenter>> =>
        instrumentationService.startSpan({ name: 'listAccountCalendars Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return accountCalendarsPresenter(await listAccountCalendarsUseCase());
        });
