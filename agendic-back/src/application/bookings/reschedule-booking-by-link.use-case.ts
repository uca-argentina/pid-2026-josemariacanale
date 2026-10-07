import { Inject, Injectable } from '@nestjs/common';
import { BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { findBookingByLink } from './find-booking-by-link';
import { pickEmployee } from './pick-employee';

/**
 * Reagenda un Turno pendiente o aceptado por su Enlace del Turno a otro Horario reservable del mismo Servicio, con
 * las mismas reglas que Reagendar del Cliente (ADR 0022).
 */
@Injectable()
export class RescheduleBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o `startsAt` no es un Horario reservable de ningún Empleado
   * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
   */
  async execute(link: string, startsAt: Date): Promise<ClientBooking> {
    const booking = await findBookingByLink(this.bookings, link);
    const endsAt = new Date(
      startsAt.getTime() + (booking.endsAt.getTime() - booking.startsAt.getTime()),
    );
    const service = await this.services.findById(booking.serviceId);
    const prepStartsAt = new Date(
      startsAt.getTime() - (service?.prepMinutes ?? 0) * 60_000,
    );
    const attendant = await pickEmployee(
      this.listSlots,
      this.bookings,
      booking.serviceId,
      startsAt,
      { excludeBookingId: booking.id, keepEmployeeId: booking.employeeId ?? undefined },
    );
    const status = service?.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;
    return this.bookings.reschedulePendingOrBooked(booking.id, {
      ...attendant,
      prepStartsAt,
      startsAt,
      endsAt,
      status,
    });
  }
}
