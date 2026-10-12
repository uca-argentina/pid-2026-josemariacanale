import { Inject, Injectable } from '@nestjs/common';
import {
  BranchWithImages,
  CreateBranchInput,
} from '../../domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  FILE_STORAGE,
  FileStorage,
  FileUpload,
} from '../../domain/file-storage';
import { assertOwner } from '../businesses/assert-owner';
import { withUploadedFiles } from '../uploaded-files';

@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  /**
   * Creates the Sucursal with its images, in the order given, so it never exists without one. Uploads the files
   * first; if any upload or the creation fails, deletes the files already uploaded (best effort: a file left behind
   * is only wasted space, so the original error is the one reported).
   *
   * @throws {NotFoundError} el Negocio no existe
   * @throws {ForbiddenError} el Usuario no es el Dueño del Negocio
   * @throws {ConflictError} el Enlace de reserva ya está en uso en el Negocio
   * @throws el error del storage si falla alguna subida
   */
  async execute(
    userId: number,
    businessId: number,
    input: CreateBranchInput,
    images: FileUpload[],
  ): Promise<BranchWithImages> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return withUploadedFiles(this.storage, images, (urls) =>
      this.branches.createWithImages({ businessId, ...input }, urls),
    );
  }
}
