import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  CABINS_REPOSITORY,
  CabinsRepository,
} from '../../domain/cabins/cabins.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';
import { findActiveCabin } from './find-active-cabin';

/** Da de baja una Cabina; la fila queda como historial. */
@Injectable()
export class RetireCabinUseCase {
  constructor(
    @Inject(CABINS_REPOSITORY) private readonly cabins: CabinsRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * @throws {NotFoundError} the Cabina doesn't exist or was already dada de baja
   * @throws {ForbiddenError} the Usuario isn't the Dueño of its Negocio
   */
  async execute(userId: number, id: number): Promise<void> {
    const cabin = await findActiveCabin(this.cabins, id);
    await assertBranchOwner(
      this.branches,
      this.businesses,
      cabin.branchId,
      userId,
    );
    await this.cabins.retire(id);
  }
}
