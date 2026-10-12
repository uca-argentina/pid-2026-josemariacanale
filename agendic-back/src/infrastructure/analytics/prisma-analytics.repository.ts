import { Injectable } from '@nestjs/common';
import {
  AnalyticsRepository,
  AnalyticsScope,
  DateRange,
  KpiValues,
} from '../../domain/analytics/analytics.repository';
import { DatabaseOperationError } from '../../domain/errors';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Fecha local, en la zona del alcance, de una columna `timestamptz`, dentro del rango. */
const inRange = (column: string, timeZone: string, range: DateRange) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE ${timeZone})::date BETWEEN ${range.from}::date AND ${range.to}::date)`;

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
}
