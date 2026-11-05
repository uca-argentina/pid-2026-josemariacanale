import { Inject, Injectable } from '@nestjs/common';
import { assertAssignedAttendant } from '../bookings/assert-assigned-attendant';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  ClientFileStreak,
  ClientFileStreakReader,
} from './client-file-streak.reader';

/** Arma la Racha, la próxima Recompensa y los Premios disponibles de la Ficha del Cliente de un Turno. */
@Injectable()
export class GetBookingStreakUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly reader: ClientFileStreakReader,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(userId: number, bookingId: number): Promise<ClientFileStreak> {
    const booking = await this.bookings.findById(bookingId);
    await assertAssignedAttendant(
      this.employees,
      booking,
      userId,
      'Only the assigned Employee can act on this Turno',
    );
    return this.reader.readOfBooking(
      bookingId,
      booking.clientEmail,
      this.clock.now(),
    );
  }
}
