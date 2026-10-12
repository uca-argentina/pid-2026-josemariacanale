import type { OutOfOffice, SaveOutOfOffice, UpdateOutOfOffice } from '@/src/entities/models/out-of-office';

/** Períodos Fuera de la oficina del Usuario con Sesión contra la API del back. */
export interface IOutOfOfficeRepository {
    /**
     * Los períodos que no terminaron, ordenados por inicio.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listOutOfOffice(): Promise<OutOfOffice[]>;

    /**
     * Crea un período del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio (422)
     * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas (409)
     */
    createOutOfOffice(input: SaveOutOfOffice): Promise<void>;

    /**
     * Reemplaza los datos de un período del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el período no existe o no es del Usuario (404)
     * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio (422)
     * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas (409)
     */
    updateOutOfOffice(input: UpdateOutOfOffice): Promise<void>;

    /**
     * Borra un período del Usuario.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     * @throws {NotFoundError} el período no existe o no es del Usuario (404)
     */
    deleteOutOfOffice(outOfOfficeId: number): Promise<void>;
}
