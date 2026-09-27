import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
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
          serviceId: data.serviceId,
          employeeId: data.employeeId,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          status: data.status,
          verificationTokenHash: hash(token),
          verificationTokenExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return { booking: toBooking(row), token };
  }

  async findById(id: number) {
    const row = await this.prisma.booking
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBooking(row);
  }

  async hasOverlappingBooked(
    employeeId: number,
    startsAt: Date,
    endsAt: Date,
  ) {
    const overlapping = await this.prisma.booking
      .findFirst({
        where: {
          employeeId,
          status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMADO] },
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

  async markBooked(id: number) {
    return toBooking(
      await this.prisma.booking
        .update({
          where: { id },
          data: {
            status: BookingStatus.BOOKED,
            verificationTokenHash: null,
            verificationTokenExpiresAt: null,
          },
        })
        .catch(translateError),
    );
  }

  async updateStatus(id: number, status: BookingStatus) {
    return toBooking(
      await this.prisma.booking
        .update({
          where: { id },
          data: { status },
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

  async listBookedByEmployee(employeeId: number, from: Date, to: Date) {
    return this.prisma.booking
      .findMany({
        where: {
          employeeId,
          status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMADO] },
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { startsAt: true, endsAt: true },
      })
      .catch(translateError);
  }
}

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  serviceId: row.serviceId,
  employeeId: row.employeeId,
  clientName: row.clientName,
  clientEmail: row.clientEmail,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status as BookingStatus,
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
