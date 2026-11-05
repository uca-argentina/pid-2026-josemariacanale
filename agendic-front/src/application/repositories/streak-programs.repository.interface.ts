import type {
    CreateStreakReward,
    SaveStreakProgram,
    StreakProgram,
    StreakProgramScope,
    StreakReward,
    UpdateStreakReward,
} from '@/src/entities/models/streak-program';

/** Las Rachas de un Negocio (solo su Dueño) o de los Servicios personales del Usuario de la Sesión, contra el back. */
export interface IStreakProgramsRepository {
    /**
     * El programa del alcance, con sus Recompensas por cantidad de Turnos; apagado y vacío si nunca se configuró.
     *
     * @throws {UnauthenticatedError} 401
     * @throws {UnauthorizedError} 403: no es el Dueño del Negocio
     * @throws {NotFoundError} 404: el Negocio no existe o está dado de baja
     * @throws {ApiRequestError} cualquier otra falla, o un cuerpo inesperado
     */
    getProgram(scope: StreakProgramScope): Promise<StreakProgram>;
    /**
     * Prende o apaga las Rachas y fija el Tiempo de quemada; crea el programa si no existe.
     *
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400: el Tiempo de quemada está fuera de rango
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} cualquier otra falla, o un cuerpo inesperado
     */
    saveProgram(input: SaveStreakProgram): Promise<StreakProgram>;
    /**
     * Crea una Recompensa; crea el programa, apagado, si no existe.
     *
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400: la forma es inválida o falta el campo que pide el tipo
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {FreeServiceNotAllowedError} 422: el Servicio gratis no es del alcance o está dado de baja
     * @throws {ApiRequestError} cualquier otra falla, o un cuerpo inesperado
     */
    createReward(input: CreateStreakReward): Promise<StreakReward>;
    /**
     * Edita una Recompensa.
     *
     * @throws {UnauthenticatedError} 401
     * @throws {InputParseError} 400
     * @throws {UnauthorizedError} 403: es Empleado de ese Negocio, pero no su Dueño
     * @throws {NotFoundError} 404: no existe, está borrada o es de otro
     * @throws {FreeServiceNotAllowedError} 422
     * @throws {ApiRequestError} cualquier otra falla, o un cuerpo inesperado
     */
    updateReward(input: UpdateStreakReward): Promise<StreakReward>;
    /**
     * Borra una Recompensa; los Premios ya ganados siguen en pie.
     *
     * @throws {UnauthenticatedError} 401
     * @throws {UnauthorizedError} 403
     * @throws {NotFoundError} 404
     * @throws {ApiRequestError} cualquier otra falla
     */
    deleteReward(id: number): Promise<void>;
}
