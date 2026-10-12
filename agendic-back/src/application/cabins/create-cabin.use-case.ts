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

/** Adds a Cabina to a Sucursal. */
@Injectable()
export class CreateCabinUseCase {
  constructor(
    @Inject(CABINS_REPOSITORY) private readonly cabins: CabinsRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * The unique name per Sucursal is Postgres's (ADR 0004): the repository raises the Conflict.
   *
   * @throws {NotFoundError} the Sucursal doesn't exist
   * @throws {ForbiddenError} the Usuario isn't the Dueño of its Negocio
   * @throws {ConflictError} `Cabin name <name> already in use in Branch <branchId>`
   */
  async execute(
    userId: number,
    branchId: number,
    name: string,
  ): Promise<Cabin> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    return this.cabins.create(branchId, name);
  }
}
