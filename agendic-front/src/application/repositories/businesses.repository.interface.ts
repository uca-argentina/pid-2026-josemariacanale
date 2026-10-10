import type { BranchImage } from '@/src/entities/models/branch-image';
import type { Business, CreateBusiness, UpdateBusiness } from '@/src/entities/models/business';

export interface IBusinessesRepository {
    // The Negocios of the Dueño of the Sesión: 0 or 1 (ADR 0012).
    listBusinesses(): Promise<Business[]>;
    // Throws AlreadyOwnerError (409), SlugTakenError (409) or InvalidSlugError (400).
    createBusiness(input: CreateBusiness): Promise<Business>;
    // Throws SlugTakenError (409) or InvalidSlugError (400); a non-Dueño gets ApiRequestError (403).
    updateBusiness(input: UpdateBusiness): Promise<Business>;
    // Throws BranchImageLimitError (422); a non-Dueño gets ApiRequestError (403), a file over 5 MB or not an image (413, 400).
    uploadBranchImage(branchId: number, file: File): Promise<BranchImage>;
    // A non-Dueño gets ApiRequestError (403); an image that is not of the Sucursal, NotFoundError (404).
    deleteBranchImage(branchId: number, imageId: number): Promise<void>;
    // `imageIds` has every image of the Sucursal in the new order. The list comes back sorted.
    reorderBranchImages(branchId: number, imageIds: number[]): Promise<BranchImage[]>;
}
