import { Inject, Injectable } from '@nestjs/common';
import { Booking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { MAILER, Mailer } from '../../domain/mailer';
import { findOwnBookedBooking } from './find-own-booked-booking';
import { notifySeries } from './notify-clients';
import { serieOf } from './serie-of';

/**
 * Cancela un Turno aceptado y los siguientes de su Serie (#305, ADR 0032), pendientes o aceptados, en un solo
 * `UPDATE`. El Empleado no tiene Plazo de cambios. Manda un solo Aviso de cambio del Turno con todas las fechas.
 */
@Injectable()
export class CancelBookingSeriesUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @returns los Turnos cancelados, por fecha
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no está aceptado o no es de una Serie
   */
  async execute(
    userId: number,
    bookingId: number,
    reason: string | null = null,
  ): Promise<Booking[]> {
    const booking = await findOwnBookedBooking(
      this.bookings,
      this.employees,
      userId,
      bookingId,
    );
    const cancelled = await this.bookings.cancelSeriesFrom(
      serieOf(booking),
      booking.userId,
      booking.startsAt,
      this.clock.now(),
      reason,
    );
    await notifySeries(
      cancelled,
      async () => (await this.bookings.findByLink(cancelled[0].link!)).timeZone,
      (...notice) => this.mailer.sendBookingCancellation(...notice),
    );
    return cancelled;
  }
}
