import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { BusinessRuleError, ForbiddenError } from '../../domain/errors';

/** Shared by Cancelar, Reagendar and Ausencia: only the assigned Empleado, only on a BOOKED Turno. */
export async function findOwnBookedBooking(
  bookings: BookingsRepository,
  employees: EmployeesRepository,
  userId: number,
  bookingId: number,
): Promise<Booking> {
  const booking = await bookings.findById(bookingId);
  const employee = await employees.findById(booking.employeeId);
  if (!employee || employee.retiredAt || employee.userId !== userId)
    throw new ForbiddenError('Only the assigned Employee can act on this Turno');
  if (booking.status !== BookingStatus.BOOKED)
    throw new BusinessRuleError('Turno is not booked');
  return booking;
}
