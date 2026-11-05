import { Injectable } from '@nestjs/common';
import {
  BadgeLevel,
  BadgeMetrics,
  EarnedLevel,
  NO_METRICS,
} from '../../domain/badges/badges';
import { BadgesRepository } from '../../domain/badges/badges.repository';
import { DatabaseOperationError } from '../../domain/errors';
import {
  BadgeLevel as PrismaBadgeLevel,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

type CountRow = { userId: number; count: number };

const toPrismaLevel = (level: BadgeLevel) =>
  level.toUpperCase() as PrismaBadgeLevel;
const fromPrismaLevel = (level: PrismaBadgeLevel) =>
  level.toLowerCase() as BadgeLevel;

/** Insignias en Postgres: las métricas son agregados por Usuario y los Niveles ganados, una tabla que solo crece. */
@Injectable()
export class PrismaBadgesRepository implements BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Un Turno atendido es el del KPI `attended` de las analíticas: aceptado, ya terminado, sin Ausencia del
   * Invitado ni del Anfitrión, y que no sea un original reagendado. Cuenta por `Booking.userId`, quien lo
   * atiende, así que suma lo personal y lo de todos sus Negocios, también donde ya fue dado de baja.
   *
   * @throws {DatabaseOperationError} una consulta falló
   */
  async measure(
    userIds: readonly number[],
    now: Date,
  ): Promise<Map<number, BadgeMetrics>> {
    if (userIds.length === 0) return new Map();
    const users = Prisma.join(userIds);
    const attended = Prisma.sql`b."userId" IN (${users}) AND b."rescheduled" IS NOT TRUE AND b."status" = 'BOOKED' AND b."endsAt" < ${now} AND b."noShowAt" IS NULL AND b."employeeNoShowAt" IS NULL`;

    const [attendedRows, fiveStarsRows, loyalRows, streakRows] =
      await Promise.all([
        this.prisma.$queryRaw<CountRow[]>`
          SELECT b."userId", COUNT(*)::int AS "count"
          FROM "Booking" b
          WHERE ${attended}
          GROUP BY b."userId"`,
        this.prisma.$queryRaw<CountRow[]>`
          SELECT b."userId", COUNT(*)::int AS "count"
          FROM "Booking" b
          JOIN "BookingRating" r ON r."bookingId" = b."id"
          WHERE b."userId" IN (${users}) AND b."rescheduled" IS NOT TRUE AND r."score" = 5
          GROUP BY b."userId"`,
        // El mismo email en varios Turnos son varias filas de Cliente (una por Turno): se agrupa por email, sin distinguir mayúsculas.
        this.prisma.$queryRaw<CountRow[]>`
          SELECT t."userId", COUNT(*)::int AS "count"
          FROM (
            SELECT b."userId"
            FROM "Booking" b
            JOIN "Client" c ON c."bookingId" = b."id"
            WHERE ${attended}
            GROUP BY b."userId", lower(c."email")
            HAVING COUNT(*) >= 3
          ) t
          GROUP BY t."userId"`,
        // La racha arranca después del último Turno con Ausencia del Anfitrión; sin ninguna, cuenta todo.
        this.prisma.$queryRaw<CountRow[]>`
          SELECT b."userId", COUNT(*)::int AS "count"
          FROM "Booking" b
          WHERE ${attended}
            AND b."startsAt" > COALESCE(
              (SELECT MAX(a."startsAt") FROM "Booking" a WHERE a."userId" = b."userId" AND a."employeeNoShowAt" IS NOT NULL),
              '-infinity'::timestamptz
            )
          GROUP BY b."userId"`,
      ]).catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Badge metrics for Users ${userIds.join(', ')} not read`,
          { cause: error },
        );
      });

    const metrics = new Map<number, BadgeMetrics>(
      userIds.map((id) => [id, { ...NO_METRICS }]),
    );
    const fill = (rows: CountRow[], metric: keyof BadgeMetrics) => {
      for (const { userId, count } of rows)
        metrics.get(userId)![metric] = count;
    };
    fill(attendedRows, 'attended');
    fill(fiveStarsRows, 'fiveStars');
    fill(loyalRows, 'loyalClients');
    fill(streakRows, 'streak');
    return metrics;
  }

  /**
   * Lista los Niveles ganados de los Usuarios, del más viejo al más nuevo.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async listEarned(
    userIds: readonly number[],
  ): Promise<Map<number, EarnedLevel[]>> {
    const rows = await this.prisma.userBadge
      .findMany({
        where: { userId: { in: [...userIds] } },
        select: {
          userId: true,
          badge: true,
          level: true,
          earnedAt: true,
          seenAt: true,
        },
        orderBy: [{ earnedAt: 'asc' }, { id: 'asc' }],
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Earned badges of Users ${userIds.join(', ')} not read`,
          { cause: error },
        );
      });
    const earned = new Map<number, EarnedLevel[]>();
    for (const { userId, level, ...rest } of rows) {
      const list = earned.get(userId) ?? [];
      list.push({ ...rest, level: fromPrismaLevel(level) });
      earned.set(userId, list);
    }
    return earned;
  }

  /**
   * `skipDuplicates` es un `ON CONFLICT DO NOTHING` sobre la unicidad (Usuario, Insignia, Nivel): lo decide la
   * base, así que dos evaluaciones a la vez no se pisan.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  async saveEarned(
    levels: readonly {
      userId: number;
      badge: string;
      level: BadgeLevel;
      earnedAt: Date;
    }[],
  ): Promise<void> {
    await this.prisma.userBadge
      .createMany({
        data: levels.map((l) => ({ ...l, level: toPrismaLevel(l.level) })),
        skipDuplicates: true,
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError('Earned badges not saved', {
          cause: error,
        });
      });
  }

  /**
   * Marca como vistos los Niveles sin ver del Usuario.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  async markSeen(userId: number, seenAt: Date): Promise<void> {
    await this.prisma.userBadge
      .updateMany({ where: { userId, seenAt: null }, data: { seenAt } })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Badges of User ${userId} not marked as seen`,
          { cause: error },
        );
      });
  }
}
