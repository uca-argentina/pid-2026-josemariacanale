import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ availabilityId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IDeleteAvailabilityController = ReturnType<typeof deleteAvailabilityController>;

/**
 * Borra Horas laborables con sus Franjas.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `availabilityId` no es válido
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} es la predeterminada o un Servicio se atiende con ella
 */
export const deleteAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteAvailabilityUseCase: IDeleteAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteAvailabilityUseCase(data.availabilityId);
        });
