import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetMyHolidaysUseCase } from '@/src/application/use-cases/holidays/get-my-holidays.use-case';
import type { HolidaySettings } from '@/src/entities/models/holiday';

const settings = ({ countryCode, holidays }: HolidaySettings) => ({
    countryCode,
    holidays: holidays.map(({ id, name, date, enabled }) => ({ id, name, date, enabled })),
});

function presenter(items: HolidaySettings, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getMyHolidays Presenter', op: 'serialize' }, () => settings(items));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetMyHolidaysController = ReturnType<typeof getMyHolidaysController>;

/**
 * Devuelve el país del Usuario con Sesión y sus Días festivos.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const getMyHolidaysController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getMyHolidaysUseCase: IGetMyHolidaysUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getMyHolidays Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await getMyHolidaysUseCase(), instrumentationService);
        });
