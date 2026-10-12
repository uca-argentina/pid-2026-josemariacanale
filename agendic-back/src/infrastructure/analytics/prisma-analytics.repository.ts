import { Injectable } from '@nestjs/common';
import {
  AnalyticsBreakdown,
  AnalyticsRepository,
  AnalyticsScope,
  DateRange,
  Granularity,
  KpiValues,
  PopularService,
  TREND_NAMES,
  TrendPoint,
} from '../../domain/analytics/analytics.repository';
import { DatabaseOperationError } from '../../domain/errors';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Fecha local, en la zona del alcance, de una columna `timestamptz`, dentro del rango. */
const inRange = (column: string, timeZone: string, range: DateRange) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE ${timeZone})::date BETWEEN ${range.from}::date AND ${range.to}::date)`;

/** Fecha local, en `timeZone`, de una columna `timestamptz`. */
const localDate = (column: string, timeZone: string) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE ${timeZone})::date)`;

const STEPS: Record<Granularity, string> = {
  day: '1 day',
  week: '1 week',
  month: '1 month',
};

/** La fecha en que arranca el período de `granularity` que contiene a `date`; la semana arranca en `weekStart` (0 = domingo). */
const bucketOf = (
  date: Prisma.Sql,
  granularity: Granularity,
  weekStart: number,
) =>
  granularity === 'day'
    ? date
    : granularity === 'month'
      ? Prisma.sql`(date_trunc('month', ${date})::date)`
      : Prisma.sql`(${date} - ((EXTRACT(DOW FROM ${date})::int - ${weekStart}::int + 7) % 7))`;

/** Analíticas agregadas en Postgres: cada KPI es un `FILTER` sobre el mismo recorrido de Turnos. */
@Injectable()
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cuenta con un solo recorrido de Turnos, un `FILTER` por KPI. Reagendar deja el original `CANCELLED` con
   * `rescheduled = true`: solo el KPI `rescheduled` lo cuenta, y el resto lo excluye con `IS NOT TRUE` (no
   * `= FALSE`) porque la columna es `null` en todo Turno que no es un original.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async kpis(
    scope: AnalyticsScope,
    range: DateRange,
    now: Date,
    serviceId?: number,
  ): Promise<KpiValues> {
    const day = (column: string) => inRange(column, scope.timeZone, range);
    const serviceFilter =
      serviceId === undefined
        ? Prisma.empty
        : Prisma.sql`AND b."serviceId" = ${serviceId}`;
    const notRescheduledOriginal = Prisma.sql`b."rescheduled" IS NOT TRUE`;
    const attended = Prisma.sql`${notRescheduledOriginal} AND b."status" = 'BOOKED' AND b."endsAt" < ${now} AND b."noShowAt" IS NULL AND b."employeeNoShowAt" IS NULL AND ${day('b."startsAt"')}`;
    const rated = Prisma.sql`${notRescheduledOriginal} AND r."id" IS NOT NULL AND ${day('r."createdAt"')}`;

    const rows = await this.prisma.$queryRaw<KpiValues[]>`
      SELECT
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."fromRescheduleId" IS NULL AND ${day('b."createdAt"')}))::int AS "booked",
        (COUNT(*) FILTER (WHERE ${attended}))::int AS "attended",
        (COUNT(*) FILTER (WHERE b."rescheduled" = TRUE AND ${day('b."cancelledAt"')}))::int AS "rescheduled",
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."status" = 'CANCELLED' AND ${day('b."cancelledAt"')}))::int AS "cancelled",
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."status" = 'REJECTED' AND ${day('b."rejectedAt"')}))::int AS "rejected",
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."status" = 'PENDING' AND ${day('b."startsAt"')}))::int AS "pending",
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."noShowAt" IS NOT NULL AND ${day('b."startsAt"')}))::int AS "noShows",
        (COUNT(*) FILTER (WHERE ${notRescheduledOriginal} AND b."employeeNoShowAt" IS NOT NULL AND ${day('b."startsAt"')}))::int AS "employeeNoShows",
        (AVG(r."score") FILTER (WHERE ${rated}))::float8 AS "averageRating",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE r."score" >= 4 AND ${rated})
            / NULLIF(COUNT(*) FILTER (WHERE ${rated}), 0),
          1
        )::float8 AS "csat",
        COALESCE(SUM(b."price") FILTER (WHERE ${attended}), 0)::float8 AS "revenue"
      FROM "Booking" b
      JOIN "Service" s ON s."id" = b."serviceId"
      LEFT JOIN "BookingRating" r ON r."bookingId" = b."id"
      WHERE s."userId" = ${scope.userId} ${serviceFilter}`.catch(
      (error: unknown) => {
        throw new DatabaseOperationError(
          `Analytics for User ${scope.userId} not read`,
          { cause: error },
        );
      },
    );
    return rows[0];
  }

  /**
   * La tendencia sale de una consulta que desarma cada Turno en un evento por KPI (con la regla y la fecha de
   * ese KPI) y lo junta con todos los períodos del rango, así los vacíos quedan en 0. El ranking no cuenta los
   * Rechazados ni los originales reagendados; las Calificaciones, las 10 más nuevas por `createdAt`.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async breakdown(
    scope: AnalyticsScope,
    range: DateRange,
    now: Date,
    granularity: Granularity,
    weekStart: number,
    serviceId?: number,
  ): Promise<AnalyticsBreakdown> {
    const { userId, timeZone } = scope;
    const local = (column: string) => localDate(column, timeZone);
    const day = (column: string) => inRange(column, timeZone, range);
    const serviceFilter =
      serviceId === undefined
        ? Prisma.empty
        : Prisma.sql`AND b."serviceId" = ${serviceId}`;
    const original = Prisma.sql`b."rescheduled" IS NOT TRUE`;
    const event = (metric: string, rule: Prisma.Sql, column: string) =>
      Prisma.sql`(${metric}, CASE WHEN ${rule} THEN ${local(column)} END)`;
    const events = Prisma.join([
      event(
        'booked',
        Prisma.sql`${original} AND b."fromRescheduleId" IS NULL`,
        'b."createdAt"',
      ),
      event(
        'attended',
        Prisma.sql`${original} AND b."status" = 'BOOKED' AND b."endsAt" < ${now} AND b."noShowAt" IS NULL AND b."employeeNoShowAt" IS NULL`,
        'b."startsAt"',
      ),
      event(
        'rescheduled',
        Prisma.sql`b."rescheduled" = TRUE`,
        'b."cancelledAt"',
      ),
      event(
        'cancelled',
        Prisma.sql`${original} AND b."status" = 'CANCELLED'`,
        'b."cancelledAt"',
      ),
      event(
        'rejected',
        Prisma.sql`${original} AND b."status" = 'REJECTED'`,
        'b."rejectedAt"',
      ),
      event(
        'noShows',
        Prisma.sql`${original} AND b."noShowAt" IS NOT NULL`,
        'b."startsAt"',
      ),
      event(
        'employeeNoShows',
        Prisma.sql`${original} AND b."employeeNoShowAt" IS NOT NULL`,
        'b."startsAt"',
      ),
    ]);
    const from = Prisma.sql`${range.from}::date`;
    const bucket = (date: Prisma.Sql) => bucketOf(date, granularity, weekStart);
    const count = (metric: string) =>
      Prisma.sql`(COUNT(*) FILTER (WHERE ev.metric = ${metric}))::int AS ${Prisma.raw(`"${metric}"`)}`;

    const [trend, popularServices, ratings] = await Promise.all([
      this.prisma.$queryRaw<TrendPoint[]>`
        WITH ev AS (
          SELECT m.metric, m.d
          FROM "Booking" b
          JOIN "Service" s ON s."id" = b."serviceId"
          CROSS JOIN LATERAL (VALUES ${events}) AS m(metric, d)
          WHERE s."userId" = ${userId} ${serviceFilter}
            AND m.d BETWEEN ${from} AND ${range.to}::date
        )
        SELECT g.bucket::date::text AS "bucket",
          ${Prisma.join(TREND_NAMES.map(count))}
        FROM generate_series((${bucket(from)})::timestamp, ${range.to}::timestamp, ${Prisma.raw(`INTERVAL '${STEPS[granularity]}'`)}) AS g(bucket)
        LEFT JOIN ev ON ${bucket(Prisma.sql`ev.d`)} = g.bucket::date
        GROUP BY g.bucket
        ORDER BY g.bucket`,
      this.prisma.$queryRaw<PopularService[]>`
        SELECT s."id" AS "serviceId", s."name", COUNT(*)::int AS "count"
        FROM "Booking" b
        JOIN "Service" s ON s."id" = b."serviceId"
        WHERE s."userId" = ${userId} ${serviceFilter}
          AND ${original} AND b."status" <> 'REJECTED' AND ${day('b."startsAt"')}
        GROUP BY s."id", s."name"
        ORDER BY "count" DESC, s."name" ASC
        LIMIT 5`,
      this.prisma.$queryRaw<
        {
          score: number;
          comment: string | null;
          createdAt: Date;
          clientName: string;
          serviceName: string;
        }[]
      >`
        SELECT r."score", r."comment", r."createdAt", c."name" AS "clientName", s."name" AS "serviceName"
        FROM "BookingRating" r
        JOIN "Booking" b ON b."id" = r."bookingId"
        JOIN "Service" s ON s."id" = b."serviceId"
        JOIN "Client" c ON c."bookingId" = b."id"
        WHERE s."userId" = ${userId} ${serviceFilter}
          AND ${original} AND ${day('r."createdAt"')}
        ORDER BY r."createdAt" DESC, r."id" DESC
        LIMIT 10`,
    ]).catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Analytics breakdown for User ${userId} not read`,
        { cause: error },
      );
    });
    return {
      trend,
      popularServices,
      recentRatings: ratings.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        employeeName: null,
      })),
    };
  }

  /**
   * @throws {DatabaseOperationError} la consulta falló
   */
  async personalServices(userId: number) {
    return this.prisma.service
      .findMany({
        where: { userId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Personal Services of User ${userId} not read`,
          { cause: error },
        );
      });
  }
}
