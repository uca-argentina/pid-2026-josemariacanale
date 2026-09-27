import { Injectable } from '@nestjs/common';
import {
  AvailabilityOverride,
  AvailabilityOverrideInterval,
  OVERLAPPING_OVERRIDE_INTERVALS,
} from '../../domain/availability-overrides/availability-override';
import { AvailabilityOverridesRepository } from '../../domain/availability-overrides/availability-overrides.repository';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
} from '../../domain/errors';
import {
  AvailabilityOverride as OverrideRow,
  Prisma,
} from '../../generated/prisma/client';
import { reassignBookedOnDate } from '../bookings/reassign-booked';
import { fromTime, toTime } from '../branches/prisma-branches.repository';
import { BOOKING_NO_OVERLAP, isExclusionViolation } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

const toDbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class PrismaAvailabilityOverridesRepository implements AvailabilityOverridesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByEmployee(employeeId: number) {
    const rows = await this.prisma.availabilityOverride
      .findMany({
        where: { employeeId },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })
      .catch(translateError);
    return groupByDate(rows);
  }

  /** Deletes the date's old rows before writing the new ones, or they would clash with each other. */
  async replace(
    employeeId: number,
    date: string,
    intervals: AvailabilityOverrideInterval[],
    coveredByEmployeeId: number | null,
  ): Promise<AvailabilityOverride> {
    const dbDate = toDbDate(date);
    return this.prisma
      .$transaction(async (tx) => {
        await tx.availabilityOverride.deleteMany({
          where: { employeeId, date: dbDate },
        });
        await tx.availabilityOverride.createMany({
          data: intervals.length
            ? intervals.map((interval) => ({
                employeeId,
                date: dbDate,
                startTime: toTime(interval.startTime),
                endTime: toTime(interval.endTime),
                coveredByEmployeeId,
              }))
            : [{ employeeId, date: dbDate, coveredByEmployeeId }],
        });
        if (coveredByEmployeeId != null)
          await reassignBookedOnDate(tx, employeeId, coveredByEmployeeId, date);
        return { employeeId, date, intervals, coveredByEmployeeId };
      })
      .catch(translateError);
  }

  async delete(employeeId: number, date: string) {
    await this.prisma.availabilityOverride
      .deleteMany({ where: { employeeId, date: toDbDate(date) } })
      .catch(translateError);
  }
}

const groupByDate = (rows: OverrideRow[]): AvailabilityOverride[] => {
  const byDate = new Map<string, OverrideRow[]>();
  for (const row of rows) {
    const key = fromDbDate(row.date);
    byDate.set(key, [...(byDate.get(key) ?? []), row]);
  }
  return [...byDate.entries()].map(([date, dateRows]) => ({
    employeeId: dateRows[0].employeeId,
    date,
    coveredByEmployeeId: dateRows[0].coveredByEmployeeId,
    intervals:
      dateRows[0].startTime === null
        ? []
        : dateRows.map((row) => ({
            startTime: fromTime(row.startTime!),
            endTime: fromTime(row.endTime!),
          })),
  }));
};

/** The use case checks both rules first; these are the constraints catching a race (ADR 0004). */
const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (isExclusionViolation(error, BOOKING_NO_OVERLAP))
      throw new ConflictError('El cubridor ya tiene un Turno a esa hora', {
        cause: error,
      });
    if (isExclusionViolation(error, 'AvailabilityOverride_no_overlap'))
      throw new BusinessRuleError(OVERLAPPING_OVERRIDE_INTERVALS, {
        cause: error,
      });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
