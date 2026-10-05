import type {
    Availability,
    AvailabilityDetail,
    CreateAvailability,
    UpdateAvailability,
} from '@/src/entities/models/availability';

/**
 * Availability del Usuario con Sesión contra la API del back.
 *
 * Solo opera sobre las propias: el back responde 404 si la Availability no es del Usuario.
 */
export interface IAvailabilitiesRepository {
    /**
     * Las Availability del Usuario, sin Franjas.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listAvailabilities(): Promise<Availability[]>;

    /**
     * Una Availability con sus Franjas y Anulaciones.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe o no es del Usuario (404)
     */
    getAvailability(availabilityId: number): Promise<AvailabilityDetail>;

    /**
     * Crea una Availability con nombre y zona horaria.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {AvailabilityRuleError} zona horaria inválida (422)
     */
    createAvailability(input: CreateAvailability): Promise<void>;

    /**
     * Reemplaza nombre, zona horaria, Franjas y Anulaciones.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe o no es del Usuario (404)
     * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida (422)
     */
    updateAvailability(input: UpdateAvailability): Promise<void>;

    /**
     * La marca predeterminada; la anterior se desmarca sola.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe o no es del Usuario (404)
     */
    makeDefault(availabilityId: number): Promise<void>;

    /**
     * Borra la Availability.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} la Availability no existe o no es del Usuario (404)
     * @throws {AvailabilityRuleError} es la predeterminada o un Servicio se atiende con ella (422)
     */
    deleteAvailability(availabilityId: number): Promise<void>;
}
