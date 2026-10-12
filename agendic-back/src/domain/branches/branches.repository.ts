import { Branch, BranchWithImages } from './branch';

export const BRANCHES_REPOSITORY = Symbol('BranchesRepository');

export interface BranchesRepository {
  /**
   * Generates the ids. Creates the Sucursal and one image per URL in one transaction, each image's order being
   * its position in `imageUrls`.
   *
   * @throws {ConflictError} el `slug` ya está en uso en el Negocio
   * @throws {DatabaseOperationError} la base respondió con error
   */
  createWithImages(
    data: Pick<
      Branch,
      'businessId' | 'name' | 'address' | 'timeZone' | 'slug'
    > &
      Partial<Pick<Branch, 'description'>>,
    imageUrls: string[],
  ): Promise<BranchWithImages>;
  findById(id: number): Promise<Branch | null>;
  listByBusiness(businessId: number): Promise<Branch[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<
      Pick<Branch, 'name' | 'address' | 'timeZone' | 'slug' | 'description'>
    >,
  ): Promise<Branch>;
}
