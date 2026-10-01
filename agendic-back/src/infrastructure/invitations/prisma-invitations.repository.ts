import { Injectable } from '@nestjs/common';
import { DatabaseOperationError } from '../../domain/errors';
import { Invitation } from '../../domain/invitations/invitation';
import { InvitationsRepository } from '../../domain/invitations/invitations.repository';
import { PrismaService } from '../prisma.service';

const toInvitation = ({ id, businessId, email, expiresAt }: Invitation) => ({
  id,
  businessId,
  email,
  expiresAt,
});

const fail = (error: unknown): never => {
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};

/** Acceso a Invitaciones contra Postgres. */
@Injectable()
export class PrismaInvitationsRepository implements InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPending(businessId: number, email: string, now: Date) {
    const row = await this.prisma.invitation
      .findFirst({ where: { businessId, email, expiresAt: { gt: now } } })
      .catch(fail);
    return row && toInvitation(row);
  }

  async create(data: Omit<Invitation, 'id'>) {
    return toInvitation(
      await this.prisma.invitation.create({ data }).catch(fail),
    );
  }

  async listPending(businessId: number, now: Date) {
    return (
      await this.prisma.invitation
        .findMany({
          where: { businessId, expiresAt: { gt: now } },
          orderBy: { id: 'asc' },
        })
        .catch(fail)
    ).map(toInvitation);
  }
}
