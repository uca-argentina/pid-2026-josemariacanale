import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { Invitation } from '../../domain/invitations/invitation';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from '../../domain/invitations/invitations.repository';
import { assertOwner } from '../businesses/assert-owner';

/**
 * Lista las Invitaciones pendientes del Negocio.
 *
 * @throws {NotFoundError} el Negocio no existe
 * @throws {ForbiddenError} no es el Dueño
 */
@Injectable()
export class ListInvitationsByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(INVITATIONS_REPOSITORY)
    private readonly invitations: InvitationsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: number, businessId: number): Promise<Invitation[]> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return this.invitations.listPending(businessId, this.clock.now());
  }
}
