import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISetCheckedCalendarsUseCase } from '@/src/application/use-cases/calendar/set-checked-calendars.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { accountCalendarsPresenter } from '@/src/interface-adapters/presenters/account-calendars.presenter';

const inputSchema = z.object({ checkedIds: z.array(z.string()) });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ISetCheckedCalendarsController = ReturnType<typeof setCheckedCalendarsController>;

/**
 * Guarda cuáles calendarios de la cuenta conectada del Usuario con Sesión cuentan como Ocupado externo y devuelve la
 * lista como quedó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `checkedIds` no es una lista de textos
 * @throws {NotFoundError} el Usuario no tiene un Calendario conectado
 * @throws {CalendarDisconnectedError} el Calendario conectado está `DISCONNECTED`
 * @throws {CalendarNotInAccountError} algún id no es de la cuenta conectada
 * @throws {CalendarsUnavailableError} Google no respondió
 */
export const setCheckedCalendarsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        setCheckedCalendarsUseCase: ISetCheckedCalendarsUseCase,
    ) =>
    async (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof accountCalendarsPresenter>> =>
        instrumentationService.startSpan({ name: 'setCheckedCalendars Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return accountCalendarsPresenter(await setCheckedCalendarsUseCase(data.checkedIds));
        });
