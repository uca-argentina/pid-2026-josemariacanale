import { Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
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
import { assertAssignedAttendant } from './assert-assigned-attendant';
import { notifySeries } from './notify-clients';
import { serieOf } from './serie-of';

/**
 * Acepta o rechaza los Turnos pendientes de una Serie (#305, ADR 0032): los de quien atiende que todavía no
 * terminaron, en un solo `UPDATE`. Al rechazar manda un solo Aviso de cambio del Turno con todas las fechas.
 */
@Injectable()
export class ResolvePendingSeriesUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param bookingId cualquier Turno de la Serie: de él salen la Serie y quién la atiende
   * @param reason el Motivo de cancelación de un Rechazo
   * @returns los Turnos que cambiaron, vacío si ninguno seguía pendiente
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {BusinessRuleError} el Turno no es de una Serie
   */
  async execute(
    userId: number,
    bookingId: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
    reason: string | null = null,
  ): Promise<Booking[]> {
    const booking = await this.bookings.findById(bookingId);
    await assertAssignedAttendant(
      this.employees,
      booking,
      userId,
      'Only the assigned Employee can accept or reject this Turno',
    );
    const resolved = await this.bookings.resolvePendingSeries(
      serieOf(booking),
      booking.userId,
      status,
      this.clock.now(),
      reason,
    );
    if (status === BookingStatus.REJECTED)
      await notifySeries(
        resolved,
        async () => (await this.bookings.findByLink(resolved[0].link!)).timeZone,
        (...notice) => this.mailer.sendBookingRejection(...notice),
      );
    return resolved;
  }
}
