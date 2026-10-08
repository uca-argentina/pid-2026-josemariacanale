import { Booking } from '../../domain/bookings/booking';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { ForbiddenError } from '../../domain/errors';

/**
 * Lets through the Usuario who attends the Turno: its Empleado, who mustn't be dado de baja, or the Usuario of a
 * Servicio personal.
 *
 * @throws {ForbiddenError} userId is not who attends it
 */
export async function assertAssignedAttendant(
  employees: EmployeesRepository,
  booking: Booking,
  userId: number,
  message: string,
): Promise<void> {
  if (booking.employeeId === null) {
    if (booking.userId !== userId) throw new ForbiddenError(message);
    return;
  }
  const employee = await employees.findById(booking.employeeId);
  if (!employee || employee.deletedAt || employee.userId !== userId)
    throw new ForbiddenError(message);
}
