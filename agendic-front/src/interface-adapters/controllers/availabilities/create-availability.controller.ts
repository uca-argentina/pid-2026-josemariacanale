import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createAvailabilitySchema } from '@/src/entities/models/availability';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ICreateAvailabilityController = ReturnType<typeof createAvailabilityController>;

/**
 * Crea Horas laborables del Usuario con nombre y zona horaria.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `name` o `timeZone` no son válidos
 * @throws {AvailabilityRuleError} zona horaria inválida
 */
export const createAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createAvailabilityUseCase: ICreateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'createAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = createAvailabilitySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Availability', { cause: error });
            await createAvailabilityUseCase(data);
        });
