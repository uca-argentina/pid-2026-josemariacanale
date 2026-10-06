import { assertAssignedAttendant } from './assert-assigned-attendant';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';

/** Shared by Aceptar and Rechazar turno: only the assigned Empleado, only on a PENDING Turno. */
export async function resolvePendingBooking(
  bookings: BookingsRepository,
  employees: EmployeesRepository,
  userId: number,
  bookingId: number,
  status: BookingStatus.BOOKED | BookingStatus.REJECTED,
): Promise<Booking> {
  const booking = await bookings.findById(bookingId);
  await assertAssignedAttendant(
    employees,
    booking,
    userId,
    'Only the assigned Employee can accept or reject this Turno',
  );
  if (booking.status !== BookingStatus.PENDING)
    throw new BusinessRuleError('Turno is not pending');
  return bookings.resolvePending(bookingId, status);
}
