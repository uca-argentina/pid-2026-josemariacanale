import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IToggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { toggleHolidaySchema, type HolidaySettings } from '@/src/entities/models/holiday';

const settings = ({ countryCode, holidays }: HolidaySettings) => ({
    countryCode,
    holidays: holidays.map(({ id, name, date, enabled }) => ({ id, name, date, enabled })),
});

function presenter(items: HolidaySettings, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'toggleHoliday Presenter', op: 'serialize' }, () => settings(items));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IToggleHolidayController = ReturnType<typeof toggleHolidayController>;

/**
 * Prende o apaga un Día festivo del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id no es texto o `enabled` no es booleano
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {NotFoundError} el Día festivo no existe
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
            const { data, error } = toggleHolidaySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid toggleHoliday', { cause: error });
            return presenter(await toggleHolidayUseCase(data), instrumentationService);
        });
