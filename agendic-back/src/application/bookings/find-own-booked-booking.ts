import { assertAssignedAttendant } from './assert-assigned-attendant';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';

/**
 * Devuelve el Turno aceptado del Empleado asignado; lo comparten Cancelar, Reagendar y Ausencia.
 *
 * @throws {NotFoundError} el Turno no existe
 * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
 * @throws {BusinessRuleError} el Turno no está aceptado
 */
export async function findOwnBookedBooking(
  bookings: BookingsRepository,
  employees: EmployeesRepository,
  userId: number,
  bookingId: number,
): Promise<Booking> {
  const booking = await bookings.findById(bookingId);
  await assertAssignedAttendant(
    employees,
    booking,
    userId,
    'Only the assigned Employee can act on this Turno',
  );
  if (booking.status !== BookingStatus.BOOKED)
    throw new BusinessRuleError('Turno is not booked');
  return booking;
}
