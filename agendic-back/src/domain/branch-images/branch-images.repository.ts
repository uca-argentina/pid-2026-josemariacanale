import { BranchImage } from './branch-image';

export const BRANCH_IMAGES_REPOSITORY = Symbol('BranchImagesRepository');

export interface BranchImagesRepository {
  /** Ascending by order, ties by id. */
  listByBranch(branchId: number): Promise<BranchImage[]>;
  findById(id: number): Promise<BranchImage | null>;
  /**
   * Generates the id and puts it after the Sucursal's last image. Counts and inserts in one transaction, so
   * concurrent calls never pass `limit`; `null` when the Sucursal already has `limit` images.
   */
  append(
    branchId: number,
    url: string,
    limit: number,
  ): Promise<BranchImage | null>;
  /**
   * Deletes image `id` of Sucursal `branchId`. Locks the Sucursal and counts and deletes in one transaction, so
   * concurrent calls queue up and never leave fewer than `keep`; `false`, deleting nothing, when the Sucursal is
   * already down to `keep` images. Checks the image under the lock, so a concurrent delete of the same image
   * answers not found rather than `false`.
   *
   * @throws {NotFoundError} la imagen no existe en esa Sucursal
   * @throws {DatabaseOperationError} la base respondió con error
   */
  delete(branchId: number, id: number, keep: number): Promise<boolean>;
  /** Gives each image its position in imageIds as its order, atomically; imageIds are exactly the Sucursal's images. */
  reorder(branchId: number, imageIds: number[]): Promise<BranchImage[]>;
}
