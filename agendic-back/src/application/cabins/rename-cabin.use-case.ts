import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Cabin } from '../../domain/cabins/cabin';
import {
  CABINS_REPOSITORY,
  CabinsRepository,
} from '../../domain/cabins/cabins.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';
import { findActiveCabin } from './find-active-cabin';

/** Renames a Cabina. */
@Injectable()
export class RenameCabinUseCase {
  constructor(
    @Inject(CABINS_REPOSITORY) private readonly cabins: CabinsRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * @throws {NotFoundError} the Cabina doesn't exist or was dada de baja
   * @throws {ForbiddenError} the Usuario isn't the Dueño of its Negocio
   * @throws {ConflictError} `Cabin name <name> already in use in Branch <branchId>`
   */
  async execute(userId: number, id: number, name: string): Promise<Cabin> {
    const cabin = await findActiveCabin(this.cabins, id);
    await assertBranchOwner(
      this.branches,
      this.businesses,
      cabin.branchId,
      userId,
    );
    return this.cabins.rename(cabin, name);
  }
}
