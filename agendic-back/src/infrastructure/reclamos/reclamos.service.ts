import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReclamoDto, UpdateReclamoDto } from './dto/reclamos.dto';
import {
  BusinessRuleError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { BookingStatus } from '../../domain/bookings/booking';

@Injectable()
export class ReclamosService {
  constructor(private readonly prisma: PrismaService) {}
  async create(link: string, input: CreateReclamoDto) {
    const booking = await this.prisma.booking.findUnique({
      select: { id: true, status: true, startsAt: true },
      where: { link: link },
    });
    if (!booking) {
      throw new NotFoundError(`Booking not found`);
    }
    if (booking.startsAt > new Date()) {
      throw new BusinessRuleError(`Booking is hasn't started yet`);
    }
    if (booking.status != BookingStatus.BOOKED) {
      throw new BusinessRuleError(
        `Booking is not in a valid state for creating a reclamo`,
      );
    }

    const existingClaim = await this.prisma.claim.findUnique({
      where: { bookingId: booking.id },
    });
    if (existingClaim) {
      throw new BusinessRuleError(
        `Claim for booking ${booking.id} already exists`,
      );
    }
    try {
      await this.prisma.claim.create({
        data: {
          bookingId: booking.id,
          reason: input.reason,
        },
      });
    } catch (error) {
      throw new DatabaseOperationError(
        `Error creating reclamo for booking ${booking.id}`,
        { cause: error },
      );
    }
    return { message: 'Reclamo creado', data: input };
  }

  async find(link: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { link: link },
    });
    if (!booking) {
      throw new NotFoundError(`Booking not found`);
    }
    const claim = await this.prisma.claim.findUnique({
      where: { bookingId: booking.id },
    });
    if (!claim) {
      throw new NotFoundError(`There is no claim for this booking id`);
    }
    return claim;
  }

  async findAll(userId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: BookingStatus.BOOKED,
        endsAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (bookings.length === 0) {
      return { message: 'No bookings found for the user', data: [] };
    }
    const claims = await this.prisma.claim.findMany({
      where: { bookingId: { in: bookings.map((b) => b.id) } },
    });
    if (!claims) {
      return { message: 'No complaints found', data: [] };
    }
    return { message: 'Reclamos found', data: claims };
  }

  async update(userId: number, claimId: number, dto: UpdateReclamoDto) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      select: { status: true, booking: { select: { userId: true } } },
    });
    if (!claim || claim.booking.userId != userId) {
      throw new NotFoundError(`Claim ${claimId} not found`);
    }
    if (claim.status === 'CLOSED') {
      throw new BusinessRuleError(`Claim Status is already closed`);
    }
    try {
      return await this.prisma.claim.update({
        where: { id: claimId },
        data: { response: dto.response, status: 'CLOSED' },
      });
    } catch (error) {
      throw new DatabaseOperationError(`Claim ${claimId} not updated`, {
        cause: error,
      });
    }
  }
}
