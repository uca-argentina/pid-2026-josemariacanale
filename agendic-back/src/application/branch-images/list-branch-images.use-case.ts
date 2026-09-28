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
import { assertBranchExists } from '../branches/assert-branch-owner';

/** Public: the Enlace de reserva shows them to anyone. */
@Injectable()
export class ListBranchImagesUseCase {
  constructor(
    @Inject(BRANCH_IMAGES_REPOSITORY)
    private readonly images: BranchImagesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
  ) {}

  async execute(branchId: number): Promise<BranchImage[]> {
    assertBranchExists(await this.branches.findById(branchId));
    return this.images.listByBranch(branchId);
  }
}
