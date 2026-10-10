/** The most images a Sucursal can have. */
export const MAX_BRANCH_IMAGES = 5;

/** An image of a Sucursal, public, served from the file storage (ADR 0015). */
export interface BranchImage {
  id: number;
  branchId: number;
  url: string;
  /** Position among its Sucursal's images, ascending; not necessarily contiguous. */
  order: number;
}
