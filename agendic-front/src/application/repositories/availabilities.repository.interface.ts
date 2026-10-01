import type { Availability, CreateAvailability, UpdateAvailability } from '@/src/entities/models/availability';

/**
 * Availability de los Empleados contra la API del back.
 *
 * Todo es del Dueño del Negocio del Empleado, salvo leerlas, que también puede el propio Empleado (ADR 0017); el
 * back responde 403 a cualquier otro Usuario y 404 si el Empleado o la Availability no existen.
 */
export interface IAvailabilitiesRepository {
    /**
     * Las Availability del Empleado con sus Franjas.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Empleado no existe (404)
     */
    listAvailabilities(employeeId: number): Promise<Availability[]>;

    /**
     * Crea una Availability con sus Franjas; la primera del Empleado nace predeterminada.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el Empleado no existe (404)
     * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar (422)
     */
    createAvailability(input: CreateAvailability): Promise<Availability>;

    /**
     * Renombra y/o reemplaza el set entero de Franjas.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe (404)
     * @throws {AvailabilityRuleError} Franjas solapadas o que no terminan después de empezar (422)
     */
    updateAvailability(input: UpdateAvailability): Promise<Availability>;

    /**
     * La marca predeterminada; la anterior se desmarca sola.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe (404)
     */
    makeDefault(availabilityId: number): Promise<Availability>;

    /**
     * Borra la Availability con sus Franjas.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe (404)
     * @throws {AvailabilityRuleError} es la predeterminada (422)
     * @throws {AvailabilityInUseError} algún Servicio la usa (409)
     */
    deleteAvailability(availabilityId: number): Promise<void>;
}
