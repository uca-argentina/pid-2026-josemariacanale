import { BranchImage } from './branch-image';

export const BRANCH_IMAGES_REPOSITORY = Symbol('BranchImagesRepository');

export interface BranchImagesRepository {
  /** Ascending by order, ties by id. */
  listByBranch(branchId: number): Promise<BranchImage[]>;
  findById(id: number): Promise<BranchImage | null>;
  /** Generates the id and puts it after the Sucursal's last image. */
  append(branchId: number, url: string): Promise<BranchImage>;
  delete(id: number): Promise<void>;
  /** Gives each image its position in imageIds as its order, atomically; imageIds are exactly the Sucursal's images. */
  reorder(branchId: number, imageIds: number[]): Promise<BranchImage[]>;
}
