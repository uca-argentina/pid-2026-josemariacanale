import type { BranchImage } from '@/src/entities/models/branch-image';
import type { Business, CreateBusiness, CreatedBusiness, UpdateBusiness } from '@/src/entities/models/business';

/** The Negocio of the Dueño of the Sesión, its Logo and the Imágenes of its Sucursales. */
export interface IBusinessesRepository {
    /** The Negocios of the Dueño of the Sesión: 0 or 1 (ADR 0012). */
    listBusinesses(): Promise<Business[]>;
    /**
     * @throws {AlreadyOwnerError} 409, the Usuario is already Dueño of a Negocio
     * @throws {SlugTakenError} 409, the Enlace de reserva is in use
     * @throws {InvalidSlugError} 400 on the Enlace de reserva
     */
    createBusiness(input: CreateBusiness): Promise<CreatedBusiness>;
    /**
     * @throws {SlugTakenError} 409
     * @throws {InvalidSlugError} 400 on the Enlace de reserva
     * @throws {ApiRequestError} 403, not the Dueño
     */
    updateBusiness(input: UpdateBusiness): Promise<Business>;
    /**
     * Uploads the Logo del Negocio, replacing the previous one.
     *
     * @returns the Negocio with its new `logoUrl`
     * @throws {ApiRequestError} 403 not the Dueño, 413 a file over 5 MB, 400 not an image
     */
    uploadBusinessLogo(businessId: number, file: File): Promise<Business>;
    /**
     * Removes the Logo del Negocio; also resolves if it had none.
     *
     * @throws {ApiRequestError} 403, not the Dueño
     */
    deleteBusinessLogo(businessId: number): Promise<void>;
    /**
     * @throws {BranchImageLimitError} 422, the Sucursal already has five
     * @throws {ApiRequestError} 403 not the Dueño, 413 a file over 5 MB, 400 not an image
     */
    uploadBranchImage(branchId: number, file: File): Promise<BranchImage>;
    /**
     * @throws {NotFoundError} 404, the image is not of the Sucursal
     * @throws {ApiRequestError} 403, not the Dueño
     */
    deleteBranchImage(branchId: number, imageId: number): Promise<void>;
    /**
     * @param imageIds every image of the Sucursal, in the new order
     * @returns the images, already sorted
     */
    reorderBranchImages(branchId: number, imageIds: number[]): Promise<BranchImage[]>;
}
