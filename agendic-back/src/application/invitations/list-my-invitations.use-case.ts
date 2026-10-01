import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from '../../domain/invitations/invitations.repository';
import { NotFoundError } from '../../domain/errors';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/**
 * Lista las Invitaciones pendientes y no vencidas dirigidas al email del Usuario.
 *
 * @throws {NotFoundError} el Usuario no existe
 */
@Injectable()
export class ListMyInvitationsUseCase {
  constructor(
    @Inject(INVITATIONS_REPOSITORY)
    private readonly invitations: InvitationsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado.');
    return this.invitations.listPendingByEmail(
      user.email.toLowerCase(),
      this.clock.now(),
    );
  }
}
