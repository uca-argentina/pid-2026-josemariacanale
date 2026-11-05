import { Injectable } from '@nestjs/common';
import { DatabaseOperationError } from '../../domain/errors';
import { StreakProgramOwner, StreakRewardType } from '../../domain/streaks/streak-program';
import {
  FichaBooking,
  NewStreakPrize,
  StreakPrizeKey,
} from '../../domain/streaks/streak-prize';
import { StreakPrizesRepository } from '../../domain/streaks/streak-prizes.repository';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const ownerFilter = (owner: StreakProgramOwner) =>
  owner.kind === 'business'
    ? Prisma.sql`br."businessId" = ${owner.businessId}`
    : Prisma.sql`s."userId" = ${owner.userId}`;

/** Consultas de los Turnos de una Ficha del Cliente y escritura de sus Premios contra Postgres. */
@Injectable()
export class PrismaStreakPrizesRepository implements StreakPrizesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The conditions repeat the `attended` KPI of the analíticas.
   *
   * @throws {DatabaseOperationError} the query failed
   */
  async listEmailsAttendedBetween(owner: StreakProgramOwner, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<{ email: string }[]>`
      SELECT DISTINCT lower(c."email") AS "email"
      FROM "Booking" b
      JOIN "Client" c ON c."bookingId" = b."id"
      JOIN "Service" s ON s."id" = b."serviceId"
      LEFT JOIN "Branch" br ON br."id" = s."branchId"
      WHERE ${ownerFilter(owner)}
        AND b."rescheduled" IS NOT TRUE
        AND b."status" = 'BOOKED'
        AND b."startsAt" >= ${from}
        AND b."endsAt" < ${to}
        AND b."noShowAt" IS NULL
        AND b."employeeNoShowAt" IS NULL`.catch((error: unknown) => {
      throw new DatabaseOperationError('Emails with a Turno atendido not read', {
        cause: error,
      });
    });
    return rows.map(({ email }) => email);
  }

  /**
   * `rescheduled` is null in every Turno that is not an original, hence `IS NOT TRUE` (ADR 0031).
   *
   * @throws {DatabaseOperationError} the query failed
   */
  async listFichaBookings(owner: StreakProgramOwner, emails: string[]) {
    return this.prisma.$queryRaw<FichaBooking[]>`
      SELECT
        lower(c."email") AS "email",
        c."name" AS "clientName",
        b."link",
        COALESCE(br."timeZone", a."timeZone") AS "timeZone",
        b."startsAt",
        b."endsAt",
        b."status",
        b."noShowAt",
        b."employeeNoShowAt"
      FROM "Booking" b
      JOIN "Client" c ON c."bookingId" = b."id"
      JOIN "Service" s ON s."id" = b."serviceId"
      LEFT JOIN "Branch" br ON br."id" = s."branchId"
      LEFT JOIN "Availability" a ON a."id" = s."availabilityId"
      WHERE ${ownerFilter(owner)}
        AND b."rescheduled" IS NOT TRUE
        AND lower(c."email") = ANY(${emails}::text[])
      ORDER BY b."startsAt", b."id"`.catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Turnos of ${emails.length} Fichas not read`,
        { cause: error },
      );
    });
  }

  /** @throws {DatabaseOperationError} the query failed */
  async listGrantedKeys(rewardIds: number[], emails: string[]): Promise<StreakPrizeKey[]> {
    return this.prisma.streakPrize
      .findMany({
        where: { rewardId: { in: rewardIds }, clientEmail: { in: emails } },
        select: {
          rewardId: true,
          clientEmail: true,
          streakStartedAt: true,
          reachedCount: true,
        },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError('Premios already granted not read', {
          cause: error,
        });
      });
  }

  /** @throws {DatabaseOperationError} the write failed */
  async createMany(prizes: NewStreakPrize[]): Promise<NewStreakPrize[]> {
    const created = await this.prisma.streakPrize
      .createManyAndReturn({
        data: prizes.map(({ owner, ...prize }) => ({
          ...prize,
          businessId: owner.kind === 'business' ? owner.businessId : null,
          userId: owner.kind === 'personal' ? owner.userId : null,
        })),
        skipDuplicates: true,
        select: {
          rewardId: true,
          clientEmail: true,
          streakStartedAt: true,
          reachedCount: true,
          type: true,
          value: true,
          description: true,
          serviceName: true,
          grantedAt: true,
          expiresAt: true,
          businessId: true,
          userId: true,
        },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(`${prizes.length} Premios not saved`, {
          cause: error,
        });
      });
    return created.map(({ businessId, userId, type, value, ...prize }) => ({
      ...prize,
      type: type as StreakRewardType,
      value: value === null ? null : value.toNumber(),
      owner:
        businessId !== null
          ? { kind: 'business', businessId }
          : { kind: 'personal', userId: userId as number },
    }));
  }
}
