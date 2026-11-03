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
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { ClientInvites } from './client-invites.service';
import { notifyClients } from './notify-clients';
import { resolvePendingBooking } from './resolve-pending-booking';

/** Acepta un Turno pendiente y le avisa por mail al Cliente, con el archivo de calendario ya confirmado. */
@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly invites: ClientInvites,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está pendiente
   */
  async execute(userId: number, bookingId: number): Promise<Booking> {
    const accepted = await resolvePendingBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
      BookingStatus.BOOKED,
      this.clock.now(),
    );
    await notifyClients(
      [accepted],
      (email, link, _reason, invite) =>
        invite
          ? this.mailer.sendBookingAcceptance(email, link, undefined, invite)
          : this.mailer.sendBookingAcceptance(email, link),
      (links) => this.invites.accept(links),
    );
    return accepted;
  }
}
