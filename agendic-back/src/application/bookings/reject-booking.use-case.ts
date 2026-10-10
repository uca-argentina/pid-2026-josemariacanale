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
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from './notify-clients';
import { resolvePendingBooking } from './resolve-pending-booking';

/** Rechaza un Turno pendiente, liberando su horario, y le avisa por mail al Cliente. */
@Injectable()
export class RejectBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está pendiente
   */
  async execute(userId: number, bookingId: number): Promise<Booking> {
    const rejected = await resolvePendingBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
      BookingStatus.REJECTED,
    );
    await notifyClients([rejected], (email, link) =>
      this.mailer.sendBookingRejection(email, link),
    );
    return rejected;
  }
}
