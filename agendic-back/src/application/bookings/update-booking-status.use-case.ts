import { Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class UpdateBookingStatusUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(
    userId: number,
    bookingId: number,
    status: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const service = await this.services.findById(booking.serviceId);
    if (!service) {
      throw new NotFoundError('Service not found');
    }

    await assertBranchOwner(
      this.branches,
      this.businesses,
      service.branchId,
      userId,
    );

    if (booking.status === status) {
      return booking;
    }

    if (
      (booking.status === BookingStatus.CANCELADO ||
        booking.status === BookingStatus.CANCELLED) &&
      status !== BookingStatus.CANCELADO &&
      status !== BookingStatus.CANCELLED
    ) {
      throw new BusinessRuleError('Cannot reactivate a cancelled booking');
    }

    return this.bookings.updateStatus(bookingId, status);
  }
}
