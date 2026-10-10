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
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from './notify-clients';
import { findOwnBookedBooking } from './find-own-booked-booking';

/** Cancela un Turno aceptado, liberando su horario, y le avisa por mail al Cliente. */
@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado
   */
  async execute(userId: number, bookingId: number): Promise<Booking> {
    await findOwnBookedBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
    );
    const cancelled = await this.bookings.cancel(bookingId);
    await notifyClients([cancelled], (email, link) =>
      this.mailer.sendBookingCancellation(email, link),
    );
    return cancelled;
  }
}
