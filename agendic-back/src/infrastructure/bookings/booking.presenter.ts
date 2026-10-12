import { employeeNoShowBlocker } from '../../domain/bookings/employee-no-show';
import { ratingBlocker } from '../../domain/bookings/rating';
import {
  Booking,
  ClientBooking,
  PanelBooking,
  UserBooking,
} from '../../domain/bookings/booking';

export const presentBooking = (booking: Booking) => ({
  id: booking.id,
  serviceId: booking.serviceId,
  employeeId: booking.employeeId,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  status: booking.status,
  notes: booking.notes,
});

/** The Turno with the Cabina it occupies (ADR 0030), for the panel; the Cliente never gets it. */
export const presentPanelBooking = (booking: PanelBooking) => ({
  ...presentBooking(booking),
  cabin: booking.cabin,
});

/** Adds what only the Dueño may see. */
export const presentBookingForOwner = (booking: PanelBooking) => ({
  ...presentPanelBooking(booking),
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
  employeeNoShowAt: booking.employeeNoShowAt,
  employeeChosen: booking.employeeChosen,
  fromRescheduleId: booking.fromRescheduleId,
  depositAmount: booking.depositAmount,
  depositPaidAt: booking.depositPaidAt,
  cabin: booking.cabin,
  serviceId: booking.serviceId,
  serviceName: booking.serviceName,
  business: booking.business,
  branch: booking.branch,
});

/**
 * Enlace del Turno: el Turno con los datos de dónde pasa, para quien abre su Enlace.
 *
 * @param now decide `canMarkEmployeeNoShow` y `canRate`, que calcula el back porque el Cliente no ve la Ausencia
 */
export const presentClientBooking = (booking: ClientBooking, now: Date) => ({
  id: booking.id,
  status: booking.status,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  timeZone: booking.timeZone,
  notes: booking.notes,
  clientName: booking.clientName,
  serviceId: booking.serviceId,
  employeeId: booking.employeeId,
  employeeChosen: booking.employeeChosen,
  depositAmount: booking.depositAmount,
  depositPaidAt: booking.depositPaidAt,
  employeeNoShowAt: booking.employeeNoShowAt,
  canMarkEmployeeNoShow: employeeNoShowBlocker(booking, now) === null,
  rating: booking.rating,
  canRate: !booking.rating && ratingBlocker(booking, now) === null,
  service: booking.service,
  employeeName: booking.employeeName,
  business: booking.business,
  branch: booking.branch,
  user: booking.user,
});
