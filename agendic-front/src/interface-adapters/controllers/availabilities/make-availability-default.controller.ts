import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMakeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ availabilityId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IMakeAvailabilityDefaultController = ReturnType<typeof makeAvailabilityDefaultController>;

/**
 * Marca Horas laborables como predeterminadas; las anteriores se desmarcan solas.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `availabilityId` no es válido
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 */
export const makeAvailabilityDefaultController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        makeAvailabilityDefaultUseCase: IMakeAvailabilityDefaultUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'makeAvailabilityDefault Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await makeAvailabilityDefaultUseCase(data.availabilityId);
        });
