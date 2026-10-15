import { Booking, BookingStatus } from './booking';

/** Horas después de `endsAt` hasta las que el Cliente puede marcar la Ausencia del Anfitrión. */
export const EMPLOYEE_NO_SHOW_WINDOW_HOURS = 24;

/** Hasta cuándo se puede marcar la Ausencia del Anfitrión de un Turno que termina en `endsAt`, inclusive. */
export const employeeNoShowWindowEnd = (endsAt: Date): Date =>
  new Date(endsAt.getTime() + EMPLOYEE_NO_SHOW_WINDOW_HOURS * 3_600_000);

/**
 * Por qué hoy no se puede marcar la Ausencia del Anfitrión de un Turno, o null si se puede. Las razones van en el orden en
 * que las informa el 422 de `PATCH /booking-links/:secret/employee-no-show`.
 */
export const employeeNoShowBlocker = (
  booking: Pick<Booking, 'status' | 'startsAt' | 'endsAt' | 'noShowAt' | 'employeeNoShowAt'>,
  now: Date,
): string | null => {
  if (booking.status !== BookingStatus.BOOKED) return 'Turno is not booked';
  if (booking.startsAt > now) return 'Turno has not started yet';
  if (now > employeeNoShowWindowEnd(booking.endsAt)) return 'Employee no-show window closed';
  if (booking.noShowAt) return 'Turno has an Ausencia';
  if (booking.employeeNoShowAt) return 'Employee no-show already marked';
  return null;
};
