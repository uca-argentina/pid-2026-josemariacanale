import { Booking, EmployeeBooking } from '../../domain/bookings/booking';

export const presentBooking = (booking: Booking) => ({
  id: booking.id,
  serviceId: booking.serviceId,
  employeeId: booking.employeeId,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  status: booking.status,
  notes: booking.notes,
});

/** Adds what only the Dueño may see. */
export const presentBookingForOwner = (booking: Booking) => ({
  ...presentBooking(booking),
  clientName: booking.clientName,
  clientEmail: booking.clientEmail,
});

/** Adds the Ausencia, which only the Empleado marks and sees. */
export const presentBookingWithNoShow = (booking: Booking) => ({
  ...presentBooking(booking),
  noShowAt: booking.noShowAt,
});

/** Mis turnos: the Cliente's data and where the Turno happens, for the assigned Empleado. */
export const presentEmployeeBooking = (booking: EmployeeBooking) => ({
  id: booking.id,
  status: booking.status,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  clientName: booking.clientName,
  clientEmail: booking.clientEmail,
  noShowAt: booking.noShowAt,
  serviceId: booking.serviceId,
  serviceName: booking.serviceName,
  businessId: booking.businessId,
  businessName: booking.businessName,
  branchId: booking.branchId,
  branchName: booking.branchName,
});
