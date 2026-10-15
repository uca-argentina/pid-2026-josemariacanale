import { Inject, Injectable } from '@nestjs/common';
import { Booking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import { findOwnBookedBooking } from './find-own-booked-booking';

/** Desmarca la Ausencia de un Turno aceptado, en cualquier momento. */
@Injectable()
export class UnmarkNoShowUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado o no tiene Ausencia
   */
  async execute(userId: number, bookingId: number): Promise<Booking> {
    const booking = await findOwnBookedBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
    );
    if (!booking.noShowAt) throw new BusinessRuleError('Turno has no Ausencia');
    return this.bookings.unmarkNoShow(bookingId);
  }
}
