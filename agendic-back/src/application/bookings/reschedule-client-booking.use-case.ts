import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
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
import { rescheduleResolvedBooking } from './reschedule-resolved-booking';

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
    return rescheduleResolvedBooking(
      this.bookings,
      this.services,
      this.listSlots,
      booking,
      startsAt,
    );
  }
}
