import { Inject, Injectable } from '@nestjs/common';
import { assertNotReservedSlug } from '../../domain/slugs/assert-not-reserved-slug';
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

  /**
   * @throws {NotFoundError} el Usuario no existe
   * @throws {ConflictError} el Usuario ya es Dueño, o el Enlace de reserva es una palabra reservada o ya está en uso por un Negocio o un Usuario
   */
  async execute(
    ownerId: number,
    input: CreateBusinessInput,
  ): Promise<CreatedBusiness> {
    assertNotReservedSlug(input.business.slug);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User not found');
    if ((await this.businesses.listByOwner(ownerId)).length)
      throw new ConflictError('Ya tenés un Negocio');
    return this.businesses.create({
      business: { ...input.business, ownerId },
      branch: input.branch,
      service: input.service && {
        ...input.service,
        description: input.service.description ?? null,
        depositPercent: input.service.depositPercent ?? null,
        requiresApproval: input.service.requiresApproval ?? false,
        hidden: input.service.hidden ?? false,
        prepMinutes: input.service.prepMinutes ?? 0,
        dailyLimit: input.service.dailyLimit ?? null,
        slotInterval: input.service.slotInterval ?? null,
        minimumNoticeMinutes: input.service.minimumNoticeMinutes ?? 0,
      },
      employee: { userId: owner.id },
    });
  }
}
