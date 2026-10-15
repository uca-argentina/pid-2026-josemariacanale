import { Inject, Injectable } from '@nestjs/common';
import {
  BookingHistoryEntry,
  buildBookingHistory,
} from '../../domain/bookings/booking-history';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { assertAssignedAttendant } from './assert-assigned-attendant';

/** Arma el Historial del Turno (ADR 0033) para quien lo atiende. */
@Injectable()
export class GetBookingHistoryUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   */
  async execute(userId: number, bookingId: number): Promise<BookingHistoryEntry[]> {
    const chain = await this.bookings.findHistoryChain(bookingId);
    await assertAssignedAttendant(
      this.employees,
      chain[chain.length - 1],
      userId,
      'Only the assigned Employee can act on this Turno',
    );
    return buildBookingHistory(chain);
  }
}
