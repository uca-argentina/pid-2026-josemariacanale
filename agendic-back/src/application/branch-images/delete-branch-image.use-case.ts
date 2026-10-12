import { Inject, Injectable } from '@nestjs/common';
import { MIN_BRANCH_IMAGES } from '../../domain/branch-images/branch-image';
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
import { ConflictError, NotFoundError } from '../../domain/errors';
import { FILE_STORAGE, FileStorage } from '../../domain/file-storage';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class DeleteBranchImageUseCase {
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
   * Deletes the row before the file: failing in between leaves an unused file, never an image that won't load.
   * A failure deleting the file is only wasted space, so it doesn't fail a delete that already happened.
   *
   * @throws {NotFoundError} la imagen no existe o no es de esa Sucursal
   * @throws {ConflictError} es la última imagen de la Sucursal; no se borra ni la fila ni el archivo
   */
  async execute(
    userId: number,
    branchId: number,
    imageId: number,
  ): Promise<void> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    const image = await this.images.findById(imageId);
    if (!image || image.branchId !== branchId)
      throw new NotFoundError('Image not found');
    const deleted = await this.images.delete(
      branchId,
      imageId,
      MIN_BRANCH_IMAGES,
    );
    if (!deleted)
      throw new ConflictError(
        `Branch ${branchId} must keep at least one image`,
      );
    await this.storage.delete(image.url).catch(() => undefined);
  }
}
