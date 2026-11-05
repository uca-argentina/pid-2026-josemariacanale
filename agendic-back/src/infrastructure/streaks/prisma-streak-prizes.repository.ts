import { Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { StreakProgramOwner, StreakRewardType } from '../../domain/streaks/streak-program';
import {
  ClientFileBooking,
  NewStreakPrize,
  OwnedStreakPrize,
  StreakPrize,
  StreakPrizeKey,
} from '../../domain/streaks/streak-prize';
import { StreakPrizesRepository } from '../../domain/streaks/streak-prizes.repository';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const PRIZE_FIELDS = {
  id: true,
  type: true,
  value: true,
  description: true,
  serviceName: true,
  grantedAt: true,
  expiresAt: true,
  redeemedAt: true,
} satisfies Prisma.StreakPrizeSelect;

type PrizeRow = Prisma.StreakPrizeGetPayload<{ select: typeof PRIZE_FIELDS }>;

const toPrize = ({ type, value, ...prize }: PrizeRow): StreakPrize => ({
  ...prize,
  type: type as StreakRewardType,
  value: value === null ? null : value.toNumber(),
});

const ownerWhere = (owner: StreakProgramOwner) =>
  owner.kind === 'business'
    ? { businessId: owner.businessId }
    : { userId: owner.userId };

const ownerFilter = (owner: StreakProgramOwner) =>
  owner.kind === 'business'
    ? Prisma.sql`br."businessId" = ${owner.businessId}`
    : Prisma.sql`s."userId" = ${owner.userId}`;

/** Consultas de los Turnos de una Ficha del Cliente y escritura de sus Premios contra Postgres. */
@Injectable()
export class PrismaStreakPrizesRepository implements StreakPrizesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists the emails with a Turno atendido in the range; the conditions repeat the `attended` KPI of the analíticas.
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
      throw new DatabaseOperationError(`Emails with a Turno atendido of ${JSON.stringify(owner)} from ${from.toISOString()} not read`, {
        cause: error,
      });
    });
    return rows.map(({ email }) => email);
  }

  /**
   * Lists the Turnos of those Fichas. `rescheduled` is null in every Turno that is not an original, hence `IS NOT TRUE`
   * (ADR 0031). A Servicio personal dado de baja loses its Availability, so its zone falls back to the Usuario's default
   * one, as in the rest of the Turnos.
   *
   * @throws {DatabaseOperationError} the query failed
   */
  async listClientFileBookings(owner: StreakProgramOwner, emails: string[]) {
    return this.prisma.$queryRaw<ClientFileBooking[]>`
      SELECT
        lower(c."email") AS "email",
        c."name" AS "clientName",
        b."link",
        COALESCE(br."timeZone", a."timeZone", d."timeZone", ${DEFAULT_AVAILABILITY.timeZone}) AS "timeZone",
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
      LEFT JOIN "Availability" d ON d."userId" = s."userId" AND d."isDefault" = TRUE
      WHERE ${ownerFilter(owner)}
        AND b."rescheduled" IS NOT TRUE
        AND lower(c."email") = ANY(${emails}::text[])
      ORDER BY b."startsAt", b."id"`.catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Turnos of ${emails.length} Fichas of ${JSON.stringify(owner)} not read`,
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
        throw new DatabaseOperationError(`Premios already granted of Recompensas ${rewardIds.join(', ')} not read`, {
          cause: error,
        });
      });
  }

  /**
   * @throws {NotFoundError} the Turno does not exist
   * @throws {DatabaseOperationError} the query failed
   */
  async findOwnerByBookingId(bookingId: number): Promise<StreakProgramOwner> {
    const row = await this.prisma.booking
      .findUnique({
        where: { id: bookingId },
        select: {
          service: { select: { userId: true, branch: { select: { businessId: true } } } },
        },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Ficha of Turno ${bookingId} not read`,
          { cause: error },
        );
      });
    if (!row) throw new NotFoundError('Booking not found');
    const { userId, branch } = row.service;
    // A Servicio is of a Sucursal or of a Usuario, exactly one (ADR 0004).
    return branch
      ? { kind: 'business', businessId: branch.businessId }
      : { kind: 'personal', userId: userId! };
  }

  /** @throws {DatabaseOperationError} the query failed */
  async listAvailable(owner: StreakProgramOwner, clientEmail: string, now: Date) {
    const rows = await this.prisma.streakPrize
      .findMany({
        where: {
          ...ownerWhere(owner),
          clientEmail,
          redeemedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ grantedAt: 'asc' }, { id: 'asc' }],
        select: PRIZE_FIELDS,
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Premios available of ${JSON.stringify(owner)} not read`,
          { cause: error },
        );
      });
    return rows.map(toPrize);
  }

  /** @throws {DatabaseOperationError} the query failed */
  async findById(id: number): Promise<OwnedStreakPrize | null> {
    const row = await this.prisma.streakPrize
      .findUnique({
        where: { id },
        select: { ...PRIZE_FIELDS, clientEmail: true, businessId: true, userId: true },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(`Premio ${id} not read`, { cause: error });
      });
    if (!row) return null;
    const { clientEmail, businessId, userId } = row;
    return {
      ...toPrize(row),
      clientEmail,
      // StreakPrize_exactly_one_owner guarantees that without a Negocio there's a Usuario (ADR 0004).
      owner:
        businessId !== null
          ? { kind: 'business', businessId }
          : { kind: 'personal', userId: userId! },
    };
  }

  /**
   * @throws {ConflictError} the Premio was already Canjeado
   * @throws {DatabaseOperationError} the write failed
   */
  async redeem(id: number, bookingId: number, userId: number, now: Date) {
    const { count } = await this.prisma.streakPrize
      .updateMany({
        where: { id, redeemedAt: null },
        data: { redeemedAt: now, redeemedBookingId: bookingId, redeemedByUserId: userId },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(`Premio ${id} not redeemed`, { cause: error });
      });
    if (count === 0) throw new ConflictError(`Prize ${id} already redeemed`);
    const row = await this.prisma.streakPrize.findUniqueOrThrow({
      where: { id },
      select: PRIZE_FIELDS,
    });
    return toPrize(row);
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
        throw new DatabaseOperationError(`${prizes.length} Premios of ${JSON.stringify(prizes[0]?.owner)} not saved`, {
          cause: error,
        });
      });
    return created.map(({ businessId, userId, type, value, ...prize }) => ({
      ...prize,
      type: type as StreakRewardType,
      value: value === null ? null : value.toNumber(),
      owner:
        // StreakPrize_exactly_one_owner guarantees that without a Negocio there's a Usuario (ADR 0004).
        businessId !== null
          ? { kind: 'business', businessId }
          : { kind: 'personal', userId: userId! },
    }));
  }
}
