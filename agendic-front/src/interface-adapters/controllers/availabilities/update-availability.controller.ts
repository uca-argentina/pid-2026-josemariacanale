import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateAvailabilitySchema } from '@/src/entities/models/availability';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IUpdateAvailabilityController = ReturnType<typeof updateAvailabilityController>;

/**
 * Reemplaza nombre, zona horaria, Franjas y Anulaciones de unas Horas laborables.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el cuerpo no es válido
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 */
export const updateAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateAvailabilityUseCase: IUpdateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'updateAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = updateAvailabilitySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await updateAvailabilityUseCase(data);
        });
