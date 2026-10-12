/** The most images a Sucursal can have. */
export const MAX_BRANCH_IMAGES = 5;

/** The fewest images a Sucursal can be left with: it never goes without one. */
export const MIN_BRANCH_IMAGES = 1;

/** An image of a Sucursal, public, served from the file storage (ADR 0015). */
export interface BranchImage {
  id: number;
  branchId: number;
  url: string;
  /** Position among its Sucursal's images, ascending; not necessarily contiguous. */
  order: number;
}
