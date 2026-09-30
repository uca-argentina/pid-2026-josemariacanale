import { Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { resolvePendingBooking } from './resolve-pending-booking';

/** Acepta un Turno pendiente. */
@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  async execute(userId: number, bookingId: number): Promise<Booking> {
    return resolvePendingBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
      BookingStatus.BOOKED,
    );
  }
}
