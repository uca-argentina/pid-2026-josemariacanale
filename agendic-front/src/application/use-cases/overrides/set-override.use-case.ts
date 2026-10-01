import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Override, SetOverride } from '@/src/entities/models/override';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ISetOverrideUseCase = ReturnType<typeof setOverrideUseCase>;

/**
 * Anula una fecha de un Empleado, con Cobertura opcional.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Empleado no existe
 * @throws {OverrideRuleError} Franjas inválidas o Cobertura que no atiende los mismos Servicios
 * @throws {OverrideConflictError} la Cobertura choca con un Turno del compañero
 */
export const setOverrideUseCase =
    (instrumentationService: IInstrumentationService, overridesRepository: IOverridesRepository) =>
    (input: SetOverride): Promise<Override> =>
        instrumentationService.startSpan({ name: 'setOverride Use Case', op: 'function' }, () =>
            overridesRepository.setOverride(input),
        );
