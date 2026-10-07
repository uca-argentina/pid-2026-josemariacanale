import { Booking, BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { ServicesRepository } from '../../domain/services/services.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { pickEmployee } from './pick-employee';

/**
 * Reagenda un Turno ya identificado y validado como pendiente o aceptado a otro Horario reservable del mismo
 * Servicio, cualquiera sea cómo se identificó (por email en Mis turnos, o por Enlace del Turno, ADR 0022). Conserva
 * al Empleado si está libre y si no pasa a otro (ver `pickEmployee`); con Aprobación manual, el Turno queda (o
 * vuelve a quedar) PENDING.
 *
 * @throws {BusinessRuleError} `startsAt` no es un Horario reservable de ningún Empleado
 * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
 */
export async function rescheduleResolvedBooking(
  bookings: BookingsRepository,
  services: ServicesRepository,
  listSlots: ListSlotsUseCase,
  booking: Pick<Booking, 'id' | 'serviceId' | 'employeeId' | 'startsAt' | 'endsAt'>,
  startsAt: Date,
): Promise<ClientBooking> {
  const endsAt = new Date(
    startsAt.getTime() + (booking.endsAt.getTime() - booking.startsAt.getTime()),
  );
  const service = await services.findById(booking.serviceId);
  const prepStartsAt = new Date(
    startsAt.getTime() - (service?.prepMinutes ?? 0) * 60_000,
  );
  const attendant = await pickEmployee(listSlots, bookings, booking.serviceId, startsAt, {
    excludeBookingId: booking.id,
    keepEmployeeId: booking.employeeId ?? undefined,
  });
  const status = service?.requiresApproval
    ? BookingStatus.PENDING
    : BookingStatus.BOOKED;
  return bookings.reschedulePendingOrBooked(booking.id, {
    ...attendant,
    prepStartsAt,
    startsAt,
    endsAt,
    status,
  });
}
