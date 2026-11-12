import type { BranchImage } from '@/src/entities/models/branch-image';
import type { Business, CreateBusiness, MyBusiness, CreatedBusiness, SlugAvailability, UpdateBusiness } from '@/src/entities/models/business';

/** The Negocio of the Dueño of the Sesión, its Logo and the Imágenes of its Sucursales. */
export interface IBusinessesRepository {
    /** The Negocios of the Dueño of the Sesión: 0 or 1 (ADR 0012). */
    listBusinesses(): Promise<Business[]>;
    /**
     * Every Negocio where the Usuario is an active Empleado, their own first and the rest by name; empty if they are
     * Empleado of none.
     *
     * @throws {ApiRequestError} the back answered with an error, or with a body that is not a list of Negocios
     */
    listMyBusinesses(): Promise<MyBusiness[]>;
    /**
     * Creates the Negocio with its first Sucursal and that Sucursal's images, in one request.
     *
     * @throws {AlreadyOwnerError} 409, the Usuario is already Dueño of a Negocio
     * @throws {SlugTakenError} 409, the Enlace de reserva is in use
     * @throws {InvalidSlugError} 400 on the Enlace de reserva
     * @throws {BranchImagesRejectedError} 400 or 413, an image of the wrong type, over 5 MB, or not 1 to 5 of them
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
     * @throws {LastBranchImageError} 409, it is the Sucursal's only image
     * @throws {ApiRequestError} 403, not the Dueño
     */
    deleteBranchImage(branchId: number, imageId: number): Promise<void>;
    /**
     * @param imageIds every image of the Sucursal, in the new order
     * @returns the images, already sorted
     */
    reorderBranchImages(branchId: number, imageIds: number[]): Promise<BranchImage[]>;
    /** Whether the Dueño of the Sesión can use `slug` as the Enlace de reserva of their Negocio; their own one counts as available. */
    checkSlugAvailability(slug: string): Promise<SlugAvailability>;
}
