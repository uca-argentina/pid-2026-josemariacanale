import { Injectable } from '@nestjs/common';
import { AvailabilitiesRepository } from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  AvailabilityFields,
  AvailabilityInterval,
  OVERLAPPING_INTERVALS,
} from '../../domain/availabilities/availability';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import {
  Availability as AvailabilityRow,
  AvailabilityInterval as AvailabilityIntervalRow,
  Prisma,
} from '../../generated/prisma/client';
import { fromTime, toTime } from '../branches/prisma-branches.repository';
import { isExclusionViolation } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

export const WITH_INTERVALS = {
  intervals: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
} satisfies Prisma.AvailabilityInclude;

@Injectable()
export class PrismaAvailabilitiesRepository implements AvailabilitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByEmployee(employeeId: number) {
    return (
      await this.prisma.availability
        .findMany({
          where: { employeeId },
          include: WITH_INTERVALS,
          orderBy: { id: 'asc' },
        })
        .catch(translateError)
    ).map(toAvailability);
  }

  async findById(id: number) {
    const row = await this.prisma.availability
      .findUnique({ where: { id }, include: WITH_INTERVALS })
      .catch(translateError);
    return row && toAvailability(row);
  }

  async create(data: Omit<Availability, 'id'>) {
    return toAvailability(
      await this.prisma.availability
        .create({
          data: {
            employeeId: data.employeeId,
            name: data.name,
            isDefault: data.isDefault,
            intervals: { create: data.intervals.map(toIntervalRow) },
          },
          include: WITH_INTERVALS,
        })
        .catch(translateError),
    );
  }

  /** Deletes the old Franjas before writing the new ones, or they would clash with each other. */
  async update(id: number, data: Partial<AvailabilityFields>) {
    return this.prisma
      .$transaction(async (tx) => {
        if (data.intervals)
          await tx.availabilityInterval.deleteMany({
            where: { availabilityId: id },
          });
        return toAvailability(
          await tx.availability.update({
            where: { id },
            data: {
              name: data.name,
              intervals: data.intervals && {
                create: data.intervals.map(toIntervalRow),
              },
            },
            include: WITH_INTERVALS,
          }),
        );
      })
      .catch(translateError);
  }

  /** Unmarks first: marking first would violate the one-default index mid-transaction. */
  async makeDefault(id: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const { employeeId } = await tx.availability.findUniqueOrThrow({
          where: { id },
          select: { employeeId: true },
        });
        await tx.availability.updateMany({
          where: { employeeId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        return toAvailability(
          await tx.availability.update({
            where: { id },
            data: { isDefault: true },
            include: WITH_INTERVALS,
          }),
        );
      })
      .catch(translateError);
  }

  async delete(id: number) {
    await this.prisma.availability
      .delete({ where: { id } })
      .catch(translateError);
  }
}

export const toIntervalRow = (interval: AvailabilityInterval) => ({
  weekday: interval.weekday,
  startTime: toTime(interval.startTime),
  endTime: toTime(interval.endTime),
});

const toAvailability = (
  row: AvailabilityRow & { intervals: AvailabilityIntervalRow[] },
): Availability => ({
  id: row.id,
  employeeId: row.employeeId,
  name: row.name,
  isDefault: row.isDefault,
  intervals: row.intervals.map((interval) => ({
    weekday: interval.weekday,
    startTime: fromTime(interval.startTime),
    endTime: fromTime(interval.endTime),
  })),
});

/** The use cases check both rules first; these are the constraints catching a race (ADR 0004). */
const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // The one-default partial index is this table's only unique one.
    if (error.code === 'P2002')
      throw new ConflictError(
        'El Empleado ya tiene una Availability predeterminada',
        { cause: error },
      );
    if (isExclusionViolation(error, 'AvailabilityInterval_no_overlap'))
      throw new BusinessRuleError(OVERLAPPING_INTERVALS, { cause: error });
    if (error.code === 'P2025')
      throw new NotFoundError('Availability not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
