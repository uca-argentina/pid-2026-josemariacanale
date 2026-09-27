import { Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';

@Injectable()
export class PayDepositUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
  ) {}

  async execute(bookingId: number): Promise<Booking> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (
      booking.status === BookingStatus.CONFIRMADO ||
      booking.status === BookingStatus.BOOKED
    ) {
      return booking;
    }

    if (
      booking.status === BookingStatus.CANCELADO ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BusinessRuleError('Cannot pay deposit for a cancelled booking');
    }

    return this.bookings.updateStatus(bookingId, BookingStatus.CONFIRMADO);
  }
}
