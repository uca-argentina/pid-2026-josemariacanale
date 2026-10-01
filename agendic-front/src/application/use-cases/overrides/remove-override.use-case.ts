import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRemoveOverrideUseCase = ReturnType<typeof removeOverrideUseCase>;

/**
 * Saca la Anulación de una fecha: ese día vuelve al horario semanal.
 *
 * Que sea del Dueño del Negocio lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {NotFoundError} el Empleado no existe
 */
export const removeOverrideUseCase =
    (instrumentationService: IInstrumentationService, overridesRepository: IOverridesRepository) =>
    (employeeId: number, date: string): Promise<void> =>
        instrumentationService.startSpan({ name: 'removeOverride Use Case', op: 'function' }, () =>
            overridesRepository.removeOverride(employeeId, date),
        );
