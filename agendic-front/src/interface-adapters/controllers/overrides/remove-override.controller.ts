import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRemoveOverrideUseCase } from '@/src/application/use-cases/overrides/remove-override.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { removeOverrideSchema } from '@/src/entities/models/override';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IRemoveOverrideController = ReturnType<typeof removeOverrideController>;

/**
 * Saca la Anulación de una fecha de un Empleado.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `employeeId` o `date` no son válidos
 * @throws {NotFoundError} el Empleado no existe
 */
export const removeOverrideController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        removeOverrideUseCase: IRemoveOverrideUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'removeOverride Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = removeOverrideSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await removeOverrideUseCase(data.employeeId, data.date);
        });
