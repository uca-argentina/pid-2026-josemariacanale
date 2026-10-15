import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewUpdateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-update-out-of-office.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateOutOfOfficeSchema } from '@/src/entities/models/out-of-office';
import { leftOutsideBookingsPresenter } from '@/src/interface-adapters/presenters/left-outside-bookings.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewUpdateOutOfOfficeController = ReturnType<typeof previewUpdateOutOfOfficeController>;

/**
 * Los Turnos que editar un período Fuera de la oficina dejaría afuera, para que el Usuario los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id, las fechas, el Motivo o las notas no son válidos
 * @throws {NotFoundError} el período no existe o no es del Usuario
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 */
export const previewUpdateOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewUpdateOutOfOfficeUseCase: IPreviewUpdateOutOfOfficeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof leftOutsideBookingsPresenter>> =>
        instrumentationService.startSpan({ name: 'previewUpdateOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = updateOutOfOfficeSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Fuera de la oficina', { cause: error });
            const bookings = await previewUpdateOutOfOfficeUseCase(data);
            return instrumentationService.startSpan({ name: 'previewUpdateOutOfOffice Presenter', op: 'serialize' }, () =>
                leftOutsideBookingsPresenter(bookings),
            );
        });
