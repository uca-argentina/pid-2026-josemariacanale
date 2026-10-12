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

/** Lists the active Cabinas of a Sucursal; only its Negocio's Dueño sees them. */
@Injectable()
export class ListCabinsUseCase {
  constructor(
    @Inject(CABINS_REPOSITORY) private readonly cabins: CabinsRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * @throws {NotFoundError} the Sucursal doesn't exist
   * @throws {ForbiddenError} the Usuario isn't the Dueño of its Negocio
   */
  async execute(userId: number, branchId: number): Promise<Cabin[]> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    return this.cabins.listActiveByBranch(branchId);
  }
}
