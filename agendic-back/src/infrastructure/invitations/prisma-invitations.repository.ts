import { Injectable } from '@nestjs/common';
import { DatabaseOperationError } from '../../domain/errors';
import { Invitation } from '../../domain/invitations/invitation';
import { InvitationsRepository } from '../../domain/invitations/invitations.repository';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** The Invitación's Sucursales, in id order, read along with it. */
const BRANCHES = {
  branches: { select: { branchId: true }, orderBy: { branchId: 'asc' } },
} satisfies Prisma.InvitationInclude;

type InvitationRow = {
  id: number;
  businessId: number;
  email: string;
  expiresAt: Date;
  branches: { branchId: number }[];
};

const toInvitation = ({
  id,
  businessId,
  email,
  expiresAt,
  branches,
}: InvitationRow): Invitation => ({
  id,
  businessId,
  email,
  expiresAt,
  branchIds: branches.map(({ branchId }) => branchId),
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
      .findFirst({
        where: { businessId, email, expiresAt: { gt: now }, closedAt: null },
        include: BRANCHES,
      })
      .catch(fail);
    return row && toInvitation(row);
  }

  async create({ branchIds, ...data }: Omit<Invitation, 'id'>) {
    return toInvitation(
      await this.prisma.invitation
        .create({
          data: {
            ...data,
            branches: {
              create: branchIds.map((branchId) => ({ branchId })),
            },
          },
          include: BRANCHES,
        })
        .catch(fail),
    );
  }

  async listPending(businessId: number, now: Date) {
    return (
      await this.prisma.invitation
        .findMany({
          where: { businessId, expiresAt: { gt: now }, closedAt: null },
          include: BRANCHES,
          orderBy: { id: 'asc' },
        })
        .catch(fail)
    ).map(toInvitation);
  }

  async findById(id: number) {
    const row = await this.prisma.invitation
      .findUnique({ where: { id }, include: BRANCHES })
      .catch(fail);
    return row && { ...toInvitation(row), closedAt: row.closedAt };
  }

  async listPendingByEmail(email: string, now: Date) {
    return (
      await this.prisma.invitation
        .findMany({
          where: { email, expiresAt: { gt: now }, closedAt: null },
          include: {
            business: { select: { name: true, slug: true } },
            branches: {
              select: { branch: { select: { id: true, name: true } } },
              orderBy: { branchId: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        })
        .catch(fail)
    ).map(({ branches, ...row }) => ({
      ...toInvitation({
        ...row,
        branches: branches.map(({ branch }) => ({ branchId: branch.id })),
      }),
      business: row.business,
      branches: branches.map(({ branch }) => branch),
    }));
  }

  async replaceBranches(id: number, branchIds: number[]) {
    await this.prisma
      .$transaction(async (tx) => {
        const { businessId } = await tx.invitation.findUniqueOrThrow({
          where: { id },
          select: { businessId: true },
        });
        await tx.invitationBranch.deleteMany({ where: { invitationId: id } });
        await tx.invitationBranch.createMany({
          data: branchIds.map((branchId) => ({
            invitationId: id,
            branchId,
            businessId,
          })),
        });
      })
      .catch(fail);
  }

  async renew(id: number, expiresAt: Date) {
    await this.prisma.invitation
      .update({ where: { id }, data: { expiresAt } })
      .catch(fail);
  }

  async close(id: number, closedAt: Date) {
    await this.prisma.invitation
      .update({ where: { id }, data: { closedAt } })
      .catch(fail);
  }
}
