import { Inject, Injectable } from '@nestjs/common';
import { BranchImage } from '../../domain/branch-images/branch-image';
import {
  BRANCH_IMAGES_REPOSITORY,
  BranchImagesRepository,
} from '../../domain/branch-images/branch-images.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class ReorderBranchImagesUseCase {
  constructor(
    @Inject(BRANCH_IMAGES_REPOSITORY)
    private readonly images: BranchImagesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /** imageIds has no repeats (the DTO checks it), so it names every image exactly when it matches in length. */
  async execute(
    userId: number,
    branchId: number,
    imageIds: number[],
  ): Promise<BranchImage[]> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    const currentIds = new Set(
      (await this.images.listByBranch(branchId)).map((image) => image.id),
    );
    if (imageIds.some((id) => !currentIds.has(id)))
      throw new NotFoundError('Image not found');
    if (imageIds.length !== currentIds.size)
      throw new BusinessRuleError(
        'El orden tiene que incluir todas las imágenes de la Sucursal',
      );
    return this.images.reorder(branchId, imageIds);
  }
}
