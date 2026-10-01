import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import {
  Invitation,
  INVITATION_TTL_DAYS,
} from '../../domain/invitations/invitation';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from '../../domain/invitations/invitations.repository';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * El Dueño reenvía o cancela una Invitación pendiente de su Negocio (ADR 0019).
 *
 * Reenviar renueva el vencimiento y, si la persona todavía no es Usuario, vuelve a mandar el mail de Clerk;
 * cancelar la cierra para que deje de listarse y ya no se pueda aceptar.
 */
@Injectable()
export class ManageInvitationUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(INVITATIONS_REPOSITORY)
    private readonly invitations: InvitationsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLERK_AUTH) private readonly clerk: ClerkAuth,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @returns la Invitación con el vencimiento renovado
   * @throws {NotFoundError} la Invitación no existe o no es de un Negocio del Dueño
   * @throws {BusinessRuleError} la Invitación ya se aceptó o rechazó
   * @throws {ExternalServiceError} Clerk falló
   */
  async resend(userId: number, invitationId: number): Promise<Invitation> {
    const invitation = await this.load(userId, invitationId);
    if (!(await this.users.findByEmail(invitation.email)))
      await this.clerk.inviteByEmail(invitation.email);
    const expiresAt = new Date(
      this.clock.now().getTime() + INVITATION_TTL_DAYS * DAY_MS,
    );
    await this.invitations.renew(invitation.id, expiresAt);
    return { ...invitation, expiresAt };
  }

  /**
   * @throws {NotFoundError} la Invitación no existe o no es de un Negocio del Dueño
   * @throws {BusinessRuleError} la Invitación ya se aceptó o rechazó
   */
  async cancel(userId: number, invitationId: number): Promise<void> {
    const invitation = await this.load(userId, invitationId);
    await this.invitations.close(invitation.id, this.clock.now());
  }

  private async load(userId: number, invitationId: number) {
    const invitation = await this.invitations.findById(invitationId);
    const business =
      invitation && (await this.businesses.findById(invitation.businessId));
    if (!invitation || business?.ownerId !== userId)
      throw new NotFoundError('La invitación no existe.');
    if (invitation.closedAt)
      throw new BusinessRuleError('La invitación ya fue respondida.');
    return invitation;
  }
}
