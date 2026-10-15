import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewSetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/preview-set-holiday-country.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { setHolidayCountrySchema } from '@/src/entities/models/holiday';
import { leftOutsideBookingsPresenter } from '@/src/interface-adapters/presenters/left-outside-bookings.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewSetHolidayCountryController = ReturnType<typeof previewSetHolidayCountryController>;

/**
 * Los Turnos que cambiar el país de los Días festivos dejaría afuera, para que el Usuario los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el código de país no es texto ni `null`, o es desconocido
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const previewSetHolidayCountryController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewSetHolidayCountryUseCase: IPreviewSetHolidayCountryUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof leftOutsideBookingsPresenter>> =>
        instrumentationService.startSpan({ name: 'previewSetHolidayCountry Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = setHolidayCountrySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid setHolidayCountry', { cause: error });
            const bookings = await previewSetHolidayCountryUseCase(data);
            return instrumentationService.startSpan({ name: 'previewSetHolidayCountry Presenter', op: 'serialize' }, () =>
                leftOutsideBookingsPresenter(bookings),
            );
        });
