import type { Branch, CreateBranch, UpdateBranch } from '@/src/entities/models/branch';

/** Escritura de Sucursales, con Sesión. Listarlas es público: `IPublicBusinessesRepository`. */
export interface IBranchesRepository {
    /**
     * Crea una Sucursal en el Negocio junto con sus imágenes, en un solo pedido.
     *
     * @throws {SlugTakenError} 409: otra Sucursal del Negocio ya usa el tramo
     * @throws {InvalidSlugError} 400: el tramo no tiene un formato válido
     * @throws {BranchImagesRejectedError} 400 o 413: alguna imagen no es de un tipo aceptado, pesa más de 5 MB, o no son de 1 a 5
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
