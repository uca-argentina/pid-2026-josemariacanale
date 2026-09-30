import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createAvailabilitySchema } from '@/src/entities/models/availability';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ICreateAvailabilityController = ReturnType<typeof createAvailabilityController>;

/**
 * Crea Horas laborables de un Empleado con nombre y Franjas.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `employeeId`, `name` o `intervals` no son válidos
 * @throws {NotFoundError} el Empleado no existe
 * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar
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
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await createAvailabilityUseCase(data);
        });
