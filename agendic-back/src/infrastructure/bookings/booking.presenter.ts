import { Booking, ClientBooking, UserBooking } from '../../domain/bookings/booking';

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

/** Mis turnos (ADR 0023): the Cliente's data and where the Turno happens, for the Usuario who attends it. */
export const presentUserBooking = (booking: UserBooking) => ({
  id: booking.id,
  employeeId: booking.employeeId,
  status: booking.status,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  clientName: booking.clientName,
  clientEmail: booking.clientEmail,
  noShowAt: booking.noShowAt,
  serviceId: booking.serviceId,
  serviceName: booking.serviceName,
  business: booking.business,
  branch: booking.branch,
});

/** Enlace del Turno: el Turno con los datos de dónde pasa, para quien abre su Enlace. */
export const presentClientBooking = (booking: ClientBooking) => ({
  id: booking.id,
  status: booking.status,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  timeZone: booking.timeZone,
  notes: booking.notes,
  clientName: booking.clientName,
  serviceId: booking.serviceId,
  employeeId: booking.employeeId,
  service: booking.service,
  employeeName: booking.employeeName,
  business: booking.business,
  branch: booking.branch,
  user: booking.user,
});
