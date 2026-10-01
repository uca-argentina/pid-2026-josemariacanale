import type { Override, SetOverride } from '@/src/entities/models/override';

/**
 * Anulaciones de los Empleados contra la API del back.
 *
 * Todo es del Dueño del Negocio del Empleado; el back responde 403 a cualquier otro Usuario.
 */
export interface IOverridesRepository {
    /**
     * Las Anulaciones del Empleado, ordenadas por fecha.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Empleado no existe (404)
     */
    listOverrides(employeeId: number): Promise<Override[]>;

    /**
     * Anula una fecha; si ya estaba anulada, reemplaza lo anterior.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Empleado no existe (404)
     * @throws {OverrideRuleError} Franjas inválidas o Cobertura que no atiende los mismos Servicios (422)
     * @throws {OverrideConflictError} la Cobertura choca con un Turno del compañero (409)
     */
    setOverride(input: SetOverride): Promise<Override>;

    /**
     * Saca la Anulación: la fecha vuelve al horario semanal.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Empleado no existe (404)
     */
    removeOverride(employeeId: number, date: string): Promise<void>;
}
