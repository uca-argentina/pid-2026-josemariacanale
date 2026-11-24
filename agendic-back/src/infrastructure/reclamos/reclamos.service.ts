import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReclamoDto } from './dto/reclamos.dto';
import {
  BusinessRuleError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { BookingStatus } from '../../domain/bookings/booking';

@Injectable()
export class ReclamosService {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: CreateReclamoDto) {
    const booking = await this.prisma.booking.findUnique({
      select: { id: true, status: true, startsAt: true },
      where: { link: input.link },
    });
    if (!booking) {
      throw new NotFoundError(`Booking ${input.link} not found`);
    }
    if (booking.startsAt < new Date()) {
      throw new BusinessRuleError(`Booking is hasn't started yet`);
    }
    if (booking.status !== BookingStatus.BOOKED) {
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
          ...input,
          bookingId: booking.id,
          status: 'OPEN',
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
}
