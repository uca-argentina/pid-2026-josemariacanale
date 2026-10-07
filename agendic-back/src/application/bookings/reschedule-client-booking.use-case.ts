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
import { findClientBooking } from './find-client-booking';
import { pickEmployee } from './pick-employee';

/**
 * Reagenda un Turno pendiente o aceptado del Cliente a otro Horario reservable del mismo Servicio, con el mismo
 * Empleado si está libre y si no con otro (ver `pickEmployee`). Si el Servicio tiene Aprobación manual, el Turno
 * queda (o vuelve a quedar) PENDING (ADR 0022).
 */
@Injectable()
export class RescheduleClientBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe o no es de este email
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o `startsAt` no es un Horario reservable de ningún Empleado
   * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
   */
  async execute(
    email: string,
    bookingId: number,
    startsAt: Date,
  ): Promise<ClientBooking> {
    const booking = await findClientBooking(this.bookings, email, bookingId);
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
      { excludeBookingId: bookingId, keepEmployeeId: booking.employeeId ?? undefined },
    );
    const status = service?.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;
    return this.bookings.reschedulePendingOrBooked(bookingId, {
      ...attendant,
      prepStartsAt,
      startsAt,
      endsAt,
      status,
    });
  }
}
