import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewToggleHolidayUseCase } from '@/src/application/use-cases/holidays/preview-toggle-holiday.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { toggleHolidaySchema } from '@/src/entities/models/holiday';
import { leftOutsideBookingsPresenter } from '@/src/interface-adapters/presenters/left-outside-bookings.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewToggleHolidayController = ReturnType<typeof previewToggleHolidayController>;

/**
 * Los Turnos que prender o apagar un Día festivo dejaría afuera, para que el Usuario los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id no es texto o `enabled` no es booleano
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 * @throws {NotFoundError} el Día festivo no existe
 */
export const previewToggleHolidayController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewToggleHolidayUseCase: IPreviewToggleHolidayUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof leftOutsideBookingsPresenter>> =>
        instrumentationService.startSpan({ name: 'previewToggleHoliday Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = toggleHolidaySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid toggleHoliday', { cause: error });
            const bookings = await previewToggleHolidayUseCase(data);
            return instrumentationService.startSpan({ name: 'previewToggleHoliday Presenter', op: 'serialize' }, () =>
                leftOutsideBookingsPresenter(bookings),
            );
        });
