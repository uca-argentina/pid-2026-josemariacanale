import { Injectable } from '@nestjs/common';
import {
  AnalyticsBreakdown,
  AnalyticsRepository,
  AnalyticsScope,
  DateRange,
  EmployeeRankings,
  EmployeesPerPeriod,
  Granularity,
  KpiValues,
  PopularService,
  RankedEmployee,
  TREND_NAMES,
  TrendPoint,
} from '../../domain/analytics/analytics.repository';
import { DatabaseOperationError } from '../../domain/errors';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Fecha local, en la zona del alcance, de una columna `timestamptz`, dentro del rango. */
const inRange = (column: string, zone: Prisma.Sql, range: DateRange) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE ${zone})::date BETWEEN ${range.from}::date AND ${range.to}::date)`;

/** Fecha local, en `zone`, de una columna `timestamptz`. */
const localDate = (column: string, zone: Prisma.Sql) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE ${zone})::date)`;

/**
 * Cómo recorre Turnos cada alcance: la zona horaria con que se corta el día (la de la Availability en lo
 * personal, la de la Sucursal de cada Turno en el Negocio), el `FROM` que deja `b` (Turno) y `s` (Servicio)
 * a mano, y el `WHERE` que lo acota.
 */
const scoped = (scope: AnalyticsScope) =>
  scope.kind === 'personal'
    ? {
        zone: Prisma.sql`${scope.timeZone}`,
        from: Prisma.sql`"Booking" b JOIN "Service" s ON s."id" = b."serviceId"`,
        where: Prisma.sql`s."userId" = ${scope.userId}`,
        label: `User ${scope.userId}`,
      }
    : {
        zone: Prisma.raw('br."timeZone"'),
        from: Prisma.sql`"Booking" b JOIN "Service" s ON s."id" = b."serviceId" JOIN "Branch" br ON br."id" = s."branchId"`,
        where: Prisma.sql`br."businessId" = ${scope.businessId}
          ${scope.branchId === undefined ? Prisma.empty : Prisma.sql`AND br."id" = ${scope.branchId}`}
          ${scope.employeeId === undefined ? Prisma.empty : Prisma.sql`AND b."employeeId" = ${scope.employeeId}`}`,
        label: `Business ${scope.businessId}`,
      };

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
    const { zone, from, where, label } = scoped(scope);
    const day = (column: string) => inRange(column, zone, range);
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
      FROM ${from}
      LEFT JOIN "BookingRating" r ON r."bookingId" = b."id"
      WHERE ${where} ${serviceFilter}`.catch((error: unknown) => {
      throw new DatabaseOperationError(`Analytics for ${label} not read`, {
        cause: error,
      });
    });
    return rows[0];
  }

  /**
   * La tendencia sale de una consulta que desarma cada Turno en un evento por KPI (con la regla y la fecha de
   * ese KPI) y lo junta con todos los períodos del rango, así los vacíos quedan en 0. El ranking no cuenta los
   * Rechazados ni los originales reagendados; las Calificaciones, las 10 más nuevas por `createdAt`, con el
   * nombre del Empleado que atendió el Turno (`null` en los Servicios personales).
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
    const { zone, from: bookings, where, label } = scoped(scope);
    const local = (column: string) => localDate(column, zone);
    const day = (column: string) => inRange(column, zone, range);
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
          FROM ${bookings}
          CROSS JOIN LATERAL (VALUES ${events}) AS m(metric, d)
          WHERE ${where} ${serviceFilter}
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
        FROM ${bookings}
        WHERE ${where} ${serviceFilter}
          AND ${original} AND b."status" <> 'REJECTED' AND ${day('b."startsAt"')}
        GROUP BY s."id", s."name"
        ORDER BY "count" DESC, s."name" ASC, s."id" ASC
        LIMIT 5`,
      this.prisma.$queryRaw<
        {
          score: number;
          comment: string | null;
          createdAt: Date;
          clientName: string;
          serviceName: string;
          employeeName: string | null;
        }[]
      >`
        SELECT r."score", r."comment", r."createdAt", c."name" AS "clientName", s."name" AS "serviceName", eu."name" AS "employeeName"
        FROM ${bookings}
        JOIN "BookingRating" r ON r."bookingId" = b."id"
        JOIN "Client" c ON c."bookingId" = b."id"
        LEFT JOIN "Employee" em ON em."id" = b."employeeId"
        LEFT JOIN "User" eu ON eu."id" = em."userId"
        WHERE ${where} ${serviceFilter}
          AND ${original} AND ${day('r."createdAt"')}
        ORDER BY r."createdAt" DESC, r."id" DESC
        LIMIT 10`,
    ]).catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Analytics breakdown for ${label} not read`,
        { cause: error },
      );
    });
    return {
      trend,
      popularServices,
      recentRatings: ratings.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Lista los Servicios personales del Usuario por nombre, con los ocultos y los dados de baja.
   *
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

  /**
   * Un solo recorrido de los Empleados vigentes del Negocio con sus Turnos (sin los originales reagendados)
   * cuenta reservados y cancelados; los tops se arman acá, con desempate por nombre e id. Los rankings de
   * más reservados y más cancelados dejan afuera a los que tienen 0.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async employeeRankings(
    scope: Extract<AnalyticsScope, { kind: 'business' }>,
    range: DateRange,
    serviceId?: number,
  ): Promise<EmployeeRankings> {
    const zone = Prisma.raw('br."timeZone"');
    const branchFilter =
      scope.branchId === undefined
        ? Prisma.empty
        : Prisma.sql`AND br."id" = ${scope.branchId}`;
    const serviceFilter =
      serviceId === undefined
        ? Prisma.empty
        : Prisma.sql`AND s."id" = ${serviceId}`;
    const rows = await this.prisma.$queryRaw<
      {
        employeeId: number;
        name: string;
        imageUrl: string | null;
        booked: number;
        cancelled: number;
      }[]
    >`
      SELECT e."id" AS "employeeId", u."name", u."imageUrl",
        (COUNT(b."id") FILTER (WHERE b."status" <> 'REJECTED' AND ${inRange('b."startsAt"', zone, range)}))::int AS "booked",
        (COUNT(b."id") FILTER (WHERE b."status" = 'CANCELLED' AND ${inRange('b."cancelledAt"', zone, range)}))::int AS "cancelled"
      FROM "Employee" e
      JOIN "User" u ON u."id" = e."userId"
      LEFT JOIN ("Booking" b JOIN "Service" s ON s."id" = b."serviceId" JOIN "Branch" br ON br."id" = s."branchId")
        ON b."employeeId" = e."id" AND b."rescheduled" IS NOT TRUE ${branchFilter} ${serviceFilter}
      WHERE e."businessId" = ${scope.businessId} AND e."deletedAt" IS NULL
      GROUP BY e."id", u."name", u."imageUrl"`.catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Employee rankings of Business ${scope.businessId} not read`,
        { cause: error },
      );
    });
    const ranked = (
      count: 'booked' | 'cancelled',
      direction: 1 | -1,
      withZeros: boolean,
    ): RankedEmployee[] =>
      rows
        .filter((e) => withZeros || e[count] > 0)
        .sort(
          (a, b) =>
            direction * (a[count] - b[count]) ||
            a.name.localeCompare(b.name) ||
            a.employeeId - b.employeeId,
        )
        .slice(0, 5)
        .map(({ employeeId, name, imageUrl, ...counts }) => ({
          employeeId,
          name,
          imageUrl,
          count: counts[count],
        }));
    return {
      mostBookedEmployees: ranked('booked', -1, false),
      leastBookedEmployees: ranked('booked', 1, true),
      mostCancelledEmployees: ranked('cancelled', -1, false),
    };
  }

  /**
   * Un recorrido de los Turnos del Negocio los pasa a su período y los cruza con cada Empleado vigente y cada
   * período del rango (`generate_series`), así los vacíos quedan en 0; los períodos salen de otra consulta para
   * que existan aunque no haya Empleados.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async employeesPerPeriod(
    scope: Extract<AnalyticsScope, { kind: 'business' }>,
    range: DateRange,
    granularity: Granularity,
    weekStart: number,
    serviceId?: number,
  ): Promise<EmployeesPerPeriod> {
    const zone = Prisma.raw('br."timeZone"');
    const from = Prisma.sql`${range.from}::date`;
    const bucket = (date: Prisma.Sql) => bucketOf(date, granularity, weekStart);
    const series = Prisma.sql`generate_series((${bucket(from)})::timestamp, ${range.to}::timestamp, ${Prisma.raw(`INTERVAL '${STEPS[granularity]}'`)})`;
    const branchFilter =
      scope.branchId === undefined
        ? Prisma.empty
        : Prisma.sql`AND br."id" = ${scope.branchId}`;
    const serviceFilter =
      serviceId === undefined
        ? Prisma.empty
        : Prisma.sql`AND s."id" = ${serviceId}`;
    const startDay = localDate('b."startsAt"', zone);
    const [buckets, cells] = await Promise.all([
      this.prisma.$queryRaw<{ bucket: string }[]>`
        SELECT g.bucket::date::text AS "bucket" FROM ${series} AS g(bucket) ORDER BY g.bucket`,
      this.prisma.$queryRaw<
        {
          employeeId: number;
          name: string;
          imageUrl: string | null;
          count: number;
        }[]
      >`
        WITH bk AS (
          SELECT b."employeeId", ${bucket(startDay)} AS bucket
          FROM "Booking" b
          JOIN "Service" s ON s."id" = b."serviceId"
          JOIN "Branch" br ON br."id" = s."branchId"
          WHERE br."businessId" = ${scope.businessId} ${branchFilter} ${serviceFilter}
            AND b."status" <> 'REJECTED' AND b."rescheduled" IS NOT TRUE
            AND ${inRange('b."startsAt"', zone, range)}
        )
        SELECT e."id" AS "employeeId", u."name", u."imageUrl", COUNT(bk."employeeId")::int AS "count"
        FROM "Employee" e
        JOIN "User" u ON u."id" = e."userId"
        CROSS JOIN ${series} AS g(bucket)
        LEFT JOIN bk ON bk."employeeId" = e."id" AND bk.bucket = g.bucket::date
        WHERE e."businessId" = ${scope.businessId} AND e."deletedAt" IS NULL
        GROUP BY e."id", u."name", u."imageUrl", g.bucket
        ORDER BY u."name", e."id", g.bucket`,
    ]).catch((error: unknown) => {
      throw new DatabaseOperationError(
        `Employees per period of Business ${scope.businessId} not read`,
        { cause: error },
      );
    });
    const rows = new Map<number, EmployeesPerPeriod['rows'][number]>();
    for (const { employeeId, name, imageUrl, count } of cells) {
      const row = rows.get(employeeId) ?? {
        employeeId,
        name,
        imageUrl,
        counts: [],
      };
      row.counts.push(count);
      rows.set(employeeId, row);
    }
    return { buckets: buckets.map((b) => b.bucket), rows: [...rows.values()] };
  }

  /**
   * Lista los Servicios de las Sucursales del Negocio por nombre, con los ocultos y los dados de baja.
   *
   * @throws {DatabaseOperationError} la consulta falló
   */
  async businessServices(businessId: number) {
    return this.prisma.service
      .findMany({
        where: { branch: { businessId } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      .catch((error: unknown) => {
        throw new DatabaseOperationError(
          `Services of Business ${businessId} not read`,
          { cause: error },
        );
      });
  }
}
