import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-out-of-office.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { saveOutOfOfficeSchema } from '@/src/entities/models/out-of-office';
import { leftOutsideBookingsPresenter } from '@/src/interface-adapters/presenters/left-outside-bookings.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewOutOfOfficeController = ReturnType<typeof previewOutOfOfficeController>;

/**
 * Los Turnos que crear un período Fuera de la oficina dejaría afuera, para que el Usuario los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} las fechas, el Motivo o las notas no son válidos
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const previewOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewOutOfOfficeUseCase: IPreviewOutOfOfficeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof leftOutsideBookingsPresenter>> =>
        instrumentationService.startSpan({ name: 'previewOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = saveOutOfOfficeSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Fuera de la oficina', { cause: error });
            const bookings = await previewOutOfOfficeUseCase(data);
            return instrumentationService.startSpan({ name: 'previewOutOfOffice Presenter', op: 'serialize' }, () =>
                leftOutsideBookingsPresenter(bookings),
            );
        });
