import { Injectable } from '@nestjs/common';
import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  AvailabilityFields,
  intervalsToSchedule,
  Schedule,
  scheduleToIntervals,
} from '../../domain/availabilities/availability';
import { AvailabilityOverride } from '../../domain/availability-overrides/availability-override';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import {
  Availability as AvailabilityRow,
  AvailabilityInterval as AvailabilityIntervalRow,
  AvailabilityOverride as AvailabilityOverrideRow,
  Prisma,
} from '../../generated/prisma/client';
import { fromTime, toTime } from '../branches/prisma-branches.repository';
import { isExclusionViolation } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

export const WITH_SCHEDULE = {
  intervals: { orderBy: [{ startTime: 'asc' }, { id: 'asc' }] },
  overrides: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
} satisfies Prisma.AvailabilityInclude;

const toDbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

/** Acceso a Availability, sus Franjas y sus Anulaciones. */
@Injectable()
export class PrismaAvailabilitiesRepository implements AvailabilitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: number) {
    return this.prisma.availability
      .findMany({
        where: { userId },
        select: {
          id: true,
          userId: true,
          name: true,
          timeZone: true,
          isDefault: true,
        },
        orderBy: { id: 'asc' },
      })
      .catch(translateError);
  }

  async findById(id: number) {
    const row = await this.prisma.availability
      .findUnique({ where: { id }, include: WITH_SCHEDULE })
      .catch(translateError);
    return row && toAvailability(row);
  }

  async create(data: Pick<Availability, 'userId' | 'name' | 'timeZone'>) {
    return toAvailability(
      await this.prisma.availability
        .create({
          data: { ...data, isDefault: false },
          include: WITH_SCHEDULE,
        })
        .catch(translateError),
    );
  }

  /** Deletes the old rows before writing the new ones, or the Anulaciones would clash with themselves. */
  async replace(id: number, data: AvailabilityFields) {
    return this.prisma
      .$transaction(async (tx) => {
        await tx.availabilityInterval.deleteMany({
          where: { availabilityId: id },
        });
        await tx.availabilityOverride.deleteMany({
          where: { availabilityId: id },
        });
        return toAvailability(
          await tx.availability.update({
            where: { id },
            data: {
              name: data.name,
              timeZone: data.timeZone,
              intervals: {
                create: toIntervalRows(data.schedule),
              },
              overrides: { create: data.overrides.flatMap(toOverrideRows) },
            },
            include: WITH_SCHEDULE,
          }),
        );
      })
      .catch(translateError);
  }

  /** Unmarks first: marking first would violate the one-default index mid-transaction. */
  async makeDefault(id: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const { userId } = await tx.availability.findUniqueOrThrow({
          where: { id },
          select: { userId: true },
        });
        await tx.availability.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        return toAvailability(
          await tx.availability.update({
            where: { id },
            data: { isDefault: true },
            include: WITH_SCHEDULE,
          }),
        );
      })
      .catch(translateError);
  }

  async countServices(id: number) {
    return this.prisma.employeeService
      .count({ where: { availabilityId: id } })
      .catch(translateError);
  }

  async delete(id: number) {
    await this.prisma.availability
      .delete({ where: { id } })
      .catch((error: unknown) => {
        // On a delete, the only foreign key that can fail is EmployeeService's (ADR 0004): a Servicio uses it.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003'
        )
          throw new ConflictError('Algún Servicio usa esta Availability', {
            cause: error,
          });
        return translateError(error);
      });
  }
}

/** The Franjas as rows: the days with equal hours share one. */
export const toIntervalRows = (schedule: Schedule) =>
  scheduleToIntervals(schedule).map(({ days, start, end }) => ({
    days,
    startTime: toTime(start),
    endTime: toTime(end),
  }));

/** A día libre is one row without hours. */
const toOverrideRows = ({ date, ranges }: AvailabilityOverride) =>
  ranges.length
    ? ranges.map(({ start, end }) => ({
        date: toDbDate(date),
        startTime: toTime(start),
        endTime: toTime(end),
      }))
    : [{ date: toDbDate(date) }];

const groupOverrides = (rows: AvailabilityOverrideRow[]) => {
  const byDate = new Map<string, AvailabilityOverride>();
  for (const row of rows) {
    const date = fromDbDate(row.date);
    const override = byDate.get(date) ?? { date, ranges: [] };
    if (row.startTime && row.endTime)
      override.ranges.push({
        start: fromTime(row.startTime),
        end: fromTime(row.endTime),
      });
    byDate.set(date, override);
  }
  return [...byDate.values()];
};

export const toAvailability = (
  row: AvailabilityRow & {
    intervals: AvailabilityIntervalRow[];
    overrides: AvailabilityOverrideRow[];
  },
): Availability => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  timeZone: row.timeZone,
  isDefault: row.isDefault,
  schedule: intervalsToSchedule(
    row.intervals.map(({ days, startTime, endTime }) => ({
      days,
      start: fromTime(startTime),
      end: fromTime(endTime),
    })),
  ),
  overrides: groupOverrides(row.overrides),
});

/** The use cases check the rules first; these are the constraints catching a race (ADR 0004). */
const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // The one-default partial index is the only unique one on this table.
    if (error.code === 'P2002')
      throw new ConflictError(
        'El Usuario ya tiene una Availability predeterminada',
        { cause: error },
      );
    if (isExclusionViolation(error, 'AvailabilityOverride_no_overlap'))
      throw new BusinessRuleError('Dos rangos de una Anulación se solapan', {
        cause: error,
      });
    if (error.code === 'P2025')
      throw new NotFoundError('Availability not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
