import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Override } from '@/src/entities/models/override';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListOverridesUseCase = ReturnType<typeof listOverridesUseCase>;

/**
 * Lista las Anulaciones de un Empleado.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Empleado no existe
 */
export const listOverridesUseCase =
    (instrumentationService: IInstrumentationService, overridesRepository: IOverridesRepository) =>
    (employeeId: number): Promise<Override[]> =>
        instrumentationService.startSpan({ name: 'listOverrides Use Case', op: 'function' }, () =>
            overridesRepository.listOverrides(employeeId),
        );
