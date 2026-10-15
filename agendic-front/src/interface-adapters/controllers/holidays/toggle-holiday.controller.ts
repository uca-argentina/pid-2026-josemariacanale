import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IToggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedToggleHolidaySchema, type SavedHolidaySettings } from '@/src/entities/models/holiday';

const settings = ({ countryCode, holidays, cancelledBookings }: SavedHolidaySettings) => ({
    countryCode,
    holidays: holidays.map(({ id, name, date, enabled }) => ({ id, name, date, enabled })),
    cancelledBookings,
});

function presenter(items: SavedHolidaySettings, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'toggleHoliday Presenter', op: 'serialize' }, () => settings(items));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IToggleHolidayController = ReturnType<typeof toggleHolidayController>;

/**
 * Prende o apaga un Día festivo del Usuario con Sesión y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id no es texto, `enabled` no es booleano o los ids de Turnos no son válidos
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {NotFoundError} el Día festivo no existe
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const toggleHolidayController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        toggleHolidayUseCase: IToggleHolidayUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'toggleHoliday Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedToggleHolidaySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid toggleHoliday', { cause: error });
            return presenter(await toggleHolidayUseCase(data), instrumentationService);
        });
