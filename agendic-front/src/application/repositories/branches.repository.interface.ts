import type { Branch, CreateBranch, UpdateBranch } from '@/src/entities/models/branch';

/** Escritura de Sucursales, con Sesión. Listarlas es público: `IPublicBusinessesRepository`. */
export interface IBranchesRepository {
    /**
     * Crea una Sucursal en el Negocio.
     *
     * @throws {SlugTakenError} 409: otra Sucursal del Negocio ya usa el tramo
     * @throws {InvalidSlugError} 400: el tramo no tiene un formato válido
     * @throws {ApiRequestError} cualquier otra falla; un no Dueño recibe 403
     */
    createBranch(input: CreateBranch): Promise<Branch>;
    /**
     * Edita una Sucursal; cambiar el tramo deja de servir su Enlace de reserva anterior.
     *
     * @throws {SlugTakenError} 409: otra Sucursal del Negocio ya usa el tramo
     * @throws {InvalidSlugError} 400: el tramo no tiene un formato válido
     * @throws {ApiRequestError} cualquier otra falla; un no Dueño recibe 403
     */
    updateBranch(input: UpdateBranch): Promise<Branch>;
}
