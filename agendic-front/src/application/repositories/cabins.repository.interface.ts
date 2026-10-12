import type { Cabin, CreateCabin, RenameCabin } from '@/src/entities/models/cabin';

/** Cabinas de una Sucursal, contra el back y con Sesión. Solo las gestiona el Dueño. */
export interface ICabinsRepository {
    /**
     * Las Cabinas activas de la Sucursal, ordenadas por nombre.
     *
     * @throws {NotFoundError} 404: la Sucursal no existe
     * @throws {ApiRequestError} cualquier otra falla; un no Dueño recibe 403
     */
    listCabins(branchId: number): Promise<Cabin[]>;
    /**
     * Agrega una Cabina a la Sucursal.
     *
     * @throws {CabinNameTakenError} 409: otra Cabina de la Sucursal ya tiene ese nombre
     * @throws {InvalidCabinNameError} 400: el nombre está vacío o es demasiado largo
     * @throws {ApiRequestError} cualquier otra falla; un no Dueño recibe 403
     */
    createCabin(input: CreateCabin): Promise<Cabin>;
    /**
     * Renombra una Cabina.
     *
     * @throws {CabinNameTakenError} 409
     * @throws {InvalidCabinNameError} 400
     * @throws {NotFoundError} 404: no existe o está dada de baja
     * @throws {ApiRequestError} cualquier otra falla
     */
    renameCabin(input: RenameCabin): Promise<Cabin>;
    /**
     * Da de baja la Cabina.
     *
     * @throws {NotFoundError} 404: no existe o ya está dada de baja
     * @throws {CabinHasUpcomingBookingsError} 409: tiene Turnos pendientes o aceptados que todavía no terminaron
     * @throws {ApiRequestError} cualquier otra falla
     */
    retireCabin(id: number): Promise<void>;
}
