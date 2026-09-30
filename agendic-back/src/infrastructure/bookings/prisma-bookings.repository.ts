import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Booking, BookingStatus, EmployeeBooking } from '../../domain/bookings/booking';
import {
  BookingsRepository,
  CreateBookingData,
} from '../../domain/bookings/bookings.repository';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Booking as BookingRow, Prisma } from '../../generated/prisma/client';
import { BOOKING_NO_OVERLAP, isExclusionViolation } from '../prisma-errors';
import { PrismaService } from '../prisma.service';

/** Statuses that hold an Empleado's horario, as the Booking_no_overlap constraint does. */
const OCCUPYING = [BookingStatus.PENDING, BookingStatus.BOOKED];

/** Stores only a hash of each verification token, so a leaked table can't be used to verify a Turno. */
const hash = (token: string) =>
  createHash('sha256').update(token).digest('base64url');

@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookingData, expiresAt: Date) {
    const token = randomBytes(32).toString('base64url');
    const row = await this.prisma.booking
      .create({
        data: {
          ...data,
          verificationTokenHash: hash(token),
          verificationTokenExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return { booking: toBooking(row), token };
  }

  async hasOverlappingOccupied(
    employeeId: number,
    startsAt: Date,
    endsAt: Date,
    excludeBookingId?: number,
  ) {
    const overlapping = await this.prisma.booking
      .findFirst({
        where: {
          ...notExcluded(excludeBookingId),
          employeeId,
          status: { in: OCCUPYING },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      })
      .catch(translateError);
    return overlapping !== null;
  }

  async findByVerificationToken(token: string, now: Date) {
    const row = await this.prisma.booking
      .findFirst({ where: { verificationTokenHash: hash(token) } })
      .catch(translateError);
    if (
      !row ||
      !row.verificationTokenExpiresAt ||
      row.verificationTokenExpiresAt <= now
    )
      throw new BusinessRuleError(
        'Unknown, used or expired verification token',
      );
    return toBooking(row);
  }

  /**
   * @throws {ConflictError} el horario ya lo ocupa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async markVerified(
    id: number,
    status: BookingStatus.PENDING | BookingStatus.BOOKED,
  ) {
    return toBooking(
      await this.prisma.booking
        .update({
          where: { id },
          data: {
            status,
            verificationTokenHash: null,
            verificationTokenExpiresAt: null,
          },
        })
        .catch(translateError),
    );
  }

  async listByBusiness(businessId: number) {
    return (
      await this.prisma.booking
        .findMany({ where: { employee: { businessId } } })
        .catch(translateError)
    ).map(toBooking);
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   */
  async findById(id: number) {
    const row = await this.prisma.booking
      .findUnique({ where: { id } })
      .catch(translateError);
    if (!row) throw new NotFoundError('Booking not found');
    return toBooking(row);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente
   * @throws {NotFoundError} el Turno no existe
   */
  async resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
  ) {
    const { count } = await this.prisma.booking
      .updateMany({
        where: { id, status: BookingStatus.PENDING },
        data: { status },
      })
      .catch(translateError);
    if (count === 0) throw new BusinessRuleError('Turno is not pending');
    return this.findById(id);
  }

  async listOccupiedByEmployee(
    employeeId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ) {
    return this.prisma.booking
      .findMany({
        where: {
          ...notExcluded(excludeBookingId),
          employeeId,
          status: { in: OCCUPYING },
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { startsAt: true, endsAt: true },
      })
      .catch(translateError);
  }

  async listByEmployees(employeeIds: number[]): Promise<EmployeeBooking[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: { employeeId: { in: employeeIds } },
        include: {
          service: { include: { branch: { include: { business: true } } } },
        },
        orderBy: { startsAt: 'asc' },
      })
      .catch(translateError);
    return rows.map((row) => ({
      ...toBooking(row),
      serviceName: row.service.name,
      businessId: row.service.branch.business.id,
      businessName: row.service.branch.business.name,
      branchId: row.service.branch.id,
      branchName: row.service.branch.name,
    }));
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {NotFoundError} el Turno no existe
   */
  async cancel(id: number) {
    return this.updateBooked(
      id,
      { status: BookingStatus.CANCELLED },
      'Turno is not booked',
    );
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {ConflictError} el nuevo horario pisa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async reschedule(id: number, startsAt: Date, endsAt: Date) {
    return this.updateBooked(id, { startsAt, endsAt }, 'Turno is not booked');
  }

  /**
   * @throws {BusinessRuleError} el Turno no está aceptado, su horario no terminó o ya tiene Ausencia
   * @throws {NotFoundError} el Turno no existe
   */
  async markNoShow(id: number, now: Date) {
    return this.updateBooked(
      id,
      { noShowAt: now },
      'Turno is not booked, has not ended yet, or already has an Ausencia',
      { endsAt: { lte: now }, noShowAt: null },
    );
  }

  /** Applies `data` only while the Turno is still BOOKED (and matches `extraWhere`), so a race can't resurrect it. */
  private async updateBooked(
    id: number,
    data: Prisma.BookingUpdateManyMutationInput,
    message: string,
    extraWhere: Prisma.BookingWhereInput = {},
  ) {
    const { count } = await this.prisma.booking
      .updateMany({
        where: { id, status: BookingStatus.BOOKED, ...extraWhere },
        data,
      })
      .catch(translateError);
    if (count === 0) throw new BusinessRuleError(message);
    return this.findById(id);
  }
}

const notExcluded = (excludeBookingId?: number) =>
  excludeBookingId === undefined ? {} : { id: { not: excludeBookingId } };

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  serviceId: row.serviceId,
  employeeId: row.employeeId,
  clientName: row.clientName,
  clientEmail: row.clientEmail,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status as BookingStatus,
  notes: row.notes,
  noShowAt: row.noShowAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      throw new NotFoundError('Booking not found', { cause: error });
    if (isExclusionViolation(error, BOOKING_NO_OVERLAP))
      throw new ConflictError('Overlaps a booked Turno for this Employee', {
        cause: error,
      });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
