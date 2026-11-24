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
    const booking = await this.prisma.booking.findFirst({
      select: { id: true, status: true },
      where: { id: input.bookingId },
    });
    if (!booking) {
      throw new NotFoundError(`Booking ${input.bookingId} not found`);
    }
    if (booking.status !== BookingStatus.BOOKED) {
      throw new BusinessRuleError(
        `Booking ${input.bookingId} is not in a valid state for creating a reclamo`,
      );
    }
    try {
      await this.prisma.claim.create({
        data: {
          ...input,
          status: 'OPEN',
        },
      });
    } catch (error) {
      throw new DatabaseOperationError(
        `Error creating reclamo for booking ${input.bookingId}`,
        { cause: error },
      );
    }
    return { message: 'Reclamo creado', data: input };
  }
}
