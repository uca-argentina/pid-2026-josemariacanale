import { Inject, Injectable } from '@nestjs/common';
import {
  BranchImage,
  MAX_BRANCH_IMAGES,
} from '../../domain/branch-images/branch-image';
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
import { BusinessRuleError } from '../../domain/errors';
import {
  FILE_STORAGE,
  FileStorage,
  FileUpload,
} from '../../domain/file-storage';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class UploadBranchImageUseCase {
  constructor(
    @Inject(BRANCH_IMAGES_REPOSITORY)
    private readonly images: BranchImagesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  /**
   * @throws {BusinessRuleError} la Sucursal ya tiene cinco imágenes; el archivo subido se borra
   */
  async execute(
    userId: number,
    branchId: number,
    file: FileUpload,
  ): Promise<BranchImage> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    const url = await this.storage.upload(file);
    // Best effort: a file left behind is only wasted space, so the original error is the one to report.
    const discardFile = () => this.storage.delete(url).catch(() => undefined);
    let image: BranchImage | null;
    try {
      image = await this.images.append(branchId, url, MAX_BRANCH_IMAGES);
    } catch (error) {
      await discardFile();
      throw error;
    }
    if (!image) {
      await discardFile();
      throw new BusinessRuleError(
        `La Sucursal ya tiene ${MAX_BRANCH_IMAGES} imágenes`,
      );
    }
    return image;
  }
}
