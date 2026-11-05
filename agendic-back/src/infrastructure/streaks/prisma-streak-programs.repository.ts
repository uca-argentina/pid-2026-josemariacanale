import { Injectable } from '@nestjs/common';
import { DatabaseOperationError, NotFoundError } from '../../domain/errors';
import {
  OwnedStreakReward,
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
  async findByOwnerIncludeRewards(owner: StreakProgramOwner) {
    const row = await this.prisma.streakProgram
      .findUnique({ where: ownerKey(owner), select: PROGRAM_FIELDS })
      .catch(translateError);
    return row && { ...row, rewards: row.rewards.map(toReward) };
  }

  /** @throws {DatabaseOperationError} the write failed */
  async save(owner: StreakProgramOwner, settings: StreakProgramSettings) {
    const row = await this.prisma.streakProgram
      .upsert({
        where: ownerKey(owner),
        create: { ...ownerKey(owner), ...settings },
        update: settings,
        select: PROGRAM_FIELDS,
      })
      .catch(translateError);
    return { ...row, rewards: row.rewards.map(toReward) };
  }

  /** @throws {DatabaseOperationError} the write failed */
  async createReward(owner: StreakProgramOwner, terms: StreakRewardTerms) {
    // The upsert goes first and alone: with nothing nested, Prisma sends a native ON CONFLICT, so two
    // first Recompensas at once can't both try to create the program.
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
  async findRewardById(id: number): Promise<OwnedStreakReward | null> {
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
