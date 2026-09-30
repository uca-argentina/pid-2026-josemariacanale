import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateAvailabilitySchema } from '@/src/entities/models/availability';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IUpdateAvailabilityController = ReturnType<typeof updateAvailabilityController>;

/**
 * Renombra Horas laborables y/o reemplaza el set entero de Franjas.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `availabilityId`, `name` o `intervals` no son válidos
 * @throws {NotFoundError} la Availability no existe
 * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar
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
