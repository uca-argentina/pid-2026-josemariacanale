import { Inject, Injectable } from '@nestjs/common';
import { assertValidHours } from '../../domain/branches/branch';
import { CreateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
  CreatedBusiness,
} from '../../domain/businesses/businesses.repository';
import { ConflictError, NotFoundError } from '../../domain/errors';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class CreateBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(
    ownerId: number,
    input: CreateBusinessInput,
  ): Promise<CreatedBusiness> {
    assertValidHours(input.branch.opensAt, input.branch.closesAt);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User not found');
    if ((await this.businesses.listByOwner(ownerId)).length)
      throw new ConflictError('Ya tenés un Negocio');
    return this.businesses.create({
      business: { ...input.business, ownerId },
      branch: input.branch,
      service: {
        ...input.service,
        description: input.service.description ?? null,
      },
      employee: { name: owner.name, email: owner.email },
    });
  }
}
