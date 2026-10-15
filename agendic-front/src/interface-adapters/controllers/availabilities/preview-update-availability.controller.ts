import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/preview-update-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateAvailabilitySchema } from '@/src/entities/models/availability';
import { leftOutsideBookingsPresenter } from '@/src/interface-adapters/presenters/left-outside-bookings.presenter';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewUpdateAvailabilityController = ReturnType<typeof previewUpdateAvailabilityController>;

/**
 * Los Turnos que guardar unas Horas laborables dejaría afuera, para que el Usuario los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el cuerpo no es válido
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 */
export const previewUpdateAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewUpdateAvailabilityUseCase: IPreviewUpdateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof leftOutsideBookingsPresenter>> =>
        instrumentationService.startSpan({ name: 'previewUpdateAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = updateAvailabilitySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Availability', { cause: error });
            const bookings = await previewUpdateAvailabilityUseCase(data);
            return instrumentationService.startSpan({ name: 'previewUpdateAvailability Presenter', op: 'serialize' }, () =>
                leftOutsideBookingsPresenter(bookings),
            );
        });
