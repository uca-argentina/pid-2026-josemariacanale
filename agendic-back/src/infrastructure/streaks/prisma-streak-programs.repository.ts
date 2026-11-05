import { Injectable } from '@nestjs/common';
import { DatabaseOperationError, NotFoundError } from '../../domain/errors';
import {
  ActiveStreakProgram,
  OwnedStreakReward,
  StreakProgram,
  StreakProgramOwner,
  StreakProgramSettings,
  StreakReward,
  StreakRewardTerms,
  StreakRewardType,
} from '../../domain/streaks/streak-program';
import { StreakProgramsRepository } from '../../domain/streaks/streak-programs.repository';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const REWARD_FIELDS = {
  id: true,
  requiredCount: true,
  repeatable: true,
  type: true,
  value: true,
  description: true,
  service: { select: { id: true, name: true } },
  validForDays: true,
} satisfies Prisma.StreakRewardSelect;

const PROGRAM_FIELDS = {
  active: true,
  burnAfterDays: true,
  rewards: {
    where: { deletedAt: null },
    orderBy: [{ requiredCount: 'asc' }, { id: 'asc' }],
    select: REWARD_FIELDS,
  },
} satisfies Prisma.StreakProgramSelect;

type RewardRow = Prisma.StreakRewardGetPayload<{
  select: typeof REWARD_FIELDS;
}>;

/** Acceso a los programas de Rachas y sus Recompensas contra Postgres. */
@Injectable()
export class PrismaStreakProgramsRepository implements StreakProgramsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {DatabaseOperationError} the query failed */
  async listActiveIncludeRewards(): Promise<ActiveStreakProgram[]> {
    const grantable = {
      deletedAt: null,
      OR: [{ serviceId: null }, { service: { deletedAt: null } }],
    } satisfies Prisma.StreakRewardWhereInput;
    const rows = await this.prisma.streakProgram
      .findMany({
        where: {
          active: true,
          burnAfterDays: { not: null },
          rewards: { some: grantable },
          OR: [
            { business: { deletedAt: null } },
            { user: { deletedAt: null } },
          ],
        },
        select: {
          businessId: true,
          userId: true,
          burnAfterDays: true,
          rewards: {
            where: grantable,
            select: {
              id: true,
              requiredCount: true,
              repeatable: true,
              type: true,
              value: true,
              description: true,
              service: { select: { name: true } },
              validForDays: true,
            },
          },
        },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError('Active Rachas programs not read', {
          cause: error,
        });
      });
    return rows.map(({ businessId, userId, burnAfterDays, rewards }) => ({
      owner: toOwner({ businessId, userId }),
      // The query asks for it not null.
      burnAfterDays: burnAfterDays!,
      rewards: rewards.map(({ value, service, type, ...reward }) => ({
        ...reward,
        type: type as StreakRewardType,
        value: value === null ? null : value.toNumber(),
        serviceName: service?.name ?? null,
      })),
    }));
  }

  /** @throws {DatabaseOperationError} the query failed */
  async findByOwnerIncludeRewards(owner: StreakProgramOwner) {
    const row = await this.prisma.streakProgram
      .findUnique({ where: ownerKey(owner), select: PROGRAM_FIELDS })
      .catch(translateError);
    return row && toProgram(row);
  }

  /** @throws {DatabaseOperationError} the write failed */
  async save(owner: StreakProgramOwner, settings: StreakProgramSettings) {
    // The read goes apart: with nothing nested, Prisma's upsert is a native ON CONFLICT, so two first
    // saves at once can't both try to create the program.
    const { id } = await this.prisma.streakProgram
      .upsert({
        where: ownerKey(owner),
        create: { ...ownerKey(owner), ...settings },
        update: settings,
        select: { id: true },
      })
      .catch(translateError);
    return toProgram(
      await this.prisma.streakProgram
        .findUniqueOrThrow({ where: { id }, select: PROGRAM_FIELDS })
        .catch(translateError),
    );
  }

  /** @throws {DatabaseOperationError} the write failed */
  async createReward(owner: StreakProgramOwner, terms: StreakRewardTerms) {
    // Same native ON CONFLICT as in save, for two first Recompensas at once.
    const { id: programId } = await this.prisma.streakProgram
      .upsert({
        where: ownerKey(owner),
        create: ownerKey(owner),
        update: {},
        select: { id: true },
      })
      .catch(translateError);
    return toReward(
      await this.prisma.streakReward
        .create({ data: { ...terms, programId }, select: REWARD_FIELDS })
        .catch(translateError),
    );
  }

  /** @throws {DatabaseOperationError} the query failed */
  async findRewardByIdIncludeProgram(
    id: number,
  ): Promise<OwnedStreakReward | null> {
    const row = await this.prisma.streakReward
      .findUnique({
        where: { id },
        select: {
          ...REWARD_FIELDS,
          deletedAt: true,
          program: { select: { businessId: true, userId: true } },
        },
      })
      .catch(translateError);
    return (
      row && {
        ...toReward(row),
        deletedAt: row.deletedAt,
        owner: toOwner(row.program),
      }
    );
  }

  /**
   * @throws {NotFoundError} `Streak reward <id> not found`: it no longer exists or was borrada
   * @throws {DatabaseOperationError} the update failed
   */
  async updateReward(id: number, terms: StreakRewardTerms) {
    return toReward(
      await this.prisma.streakReward
        .update({
          where: { id, deletedAt: null },
          data: terms,
          select: REWARD_FIELDS,
        })
        .catch((error) => translateError(error, id)),
    );
  }

  /** @throws {DatabaseOperationError} the update failed */
  async deleteReward(id: number) {
    await this.prisma.streakReward
      .updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .catch(translateError);
  }
}

const ownerKey = (owner: StreakProgramOwner) =>
  owner.kind === 'business'
    ? { businessId: owner.businessId }
    : { userId: owner.userId };

const toOwner = ({
  businessId,
  userId,
}: {
  businessId: number | null;
  userId: number | null;
}): StreakProgramOwner =>
  // StreakProgram_exactly_one_owner guarantees that without a Negocio there's a Usuario (ADR 0004).
  businessId !== null
    ? { kind: 'business', businessId }
    : { kind: 'personal', userId: userId! };

const toProgram = (
  row: Prisma.StreakProgramGetPayload<{ select: typeof PROGRAM_FIELDS }>,
): StreakProgram => ({
  active: row.active,
  burnAfterDays: row.burnAfterDays,
  rewards: row.rewards.map(toReward),
});

const toReward = (row: RewardRow): StreakReward => ({
  id: row.id,
  requiredCount: row.requiredCount,
  repeatable: row.repeatable,
  type: row.type as StreakRewardType,
  value: row.value === null ? null : Number(row.value),
  description: row.description,
  service: row.service,
  validForDays: row.validForDays,
});

const translateError = (error: unknown, id?: number): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  )
    throw new NotFoundError(`Streak reward ${id} not found`, { cause: error });
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
