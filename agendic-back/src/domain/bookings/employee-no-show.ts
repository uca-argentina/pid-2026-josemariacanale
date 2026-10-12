import { Booking, BookingStatus } from './booking';

/** Horas después de `endsAt` hasta las que el Cliente puede marcar la Falta del Empleado. */
export const EMPLOYEE_NO_SHOW_WINDOW_HOURS = 24;

/**
 * Por qué hoy no se puede marcar la Falta del Empleado de un Turno, o null si se puede. Las razones van en el orden en
 * que las informa el 422 de `PATCH /booking-links/:secret/employee-no-show`.
 */
export const employeeNoShowBlocker = (
  booking: Pick<Booking, 'status' | 'startsAt' | 'endsAt' | 'noShowAt' | 'employeeNoShowAt'>,
  now: Date,
): string | null => {
  if (booking.status !== BookingStatus.BOOKED) return 'Turno is not booked';
  if (booking.startsAt > now) return 'Turno has not started yet';
  const windowEnd = booking.endsAt.getTime() + EMPLOYEE_NO_SHOW_WINDOW_HOURS * 3_600_000;
  if (now.getTime() > windowEnd) return 'Employee no-show window closed';
  if (booking.noShowAt) return 'Turno has an Ausencia';
  if (booking.employeeNoShowAt) return 'Employee no-show already marked';
  return null;
};
