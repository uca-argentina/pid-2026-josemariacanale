import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISetOverrideUseCase } from '@/src/application/use-cases/overrides/set-override.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { setOverridesSchema } from '@/src/entities/models/override';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ISetOverridesController = ReturnType<typeof setOverridesController>;

/**
 * Anula una o más fechas de un Empleado con las mismas Franjas y la misma Cobertura.
 *
 * Va fecha por fecha, en orden; si una falla, las anteriores ya quedaron guardadas y las siguientes no
 * se intentan.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `employeeId`, `dates`, `intervals` o `coveredByEmployeeId` no son válidos
 * @throws {NotFoundError} el Empleado no existe
 * @throws {OverrideRuleError} Franjas inválidas o Cobertura que no atiende los mismos Servicios
 * @throws {OverrideConflictError} la Cobertura choca con un Turno del compañero
 */
export const setOverridesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        setOverrideUseCase: ISetOverrideUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'setOverrides Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = setOverridesSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            const { dates, ...override } = data;
            for (const date of dates) await setOverrideUseCase({ ...override, date });
        });
