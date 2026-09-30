import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
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

/** Marca la Ausencia de un Turno aceptado cuyo horario ya pasó. */
@Injectable()
export class MarkNoShowUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado, su horario todavía no pasó o ya tiene Ausencia
   */
  async execute(userId: number, bookingId: number): Promise<Booking> {
    const now = this.clock.now();
    const booking = await findOwnBookedBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
    );
    if (booking.endsAt > now)
      throw new BusinessRuleError('Turno has not ended yet');
    if (booking.noShowAt) throw new BusinessRuleError('Turno already has an Ausencia');
    return this.bookings.markNoShow(bookingId, now);
  }
}
