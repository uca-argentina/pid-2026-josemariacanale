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
import { MAILER, Mailer } from '../../domain/mailer';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { notifyClients } from './notify-clients';
import { findBookingByLink } from './find-booking-by-link';
import { rescheduleResolvedBooking } from './reschedule-resolved-booking';

/**
 * Reagenda un Turno pendiente o aceptado por su Enlace del Turno a otro Horario reservable del mismo Servicio
 * (ADR 0022), y le avisa por mail al Cliente.
 */
@Injectable()
export class RescheduleBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    private readonly listSlots: ListSlotsUseCase,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o `startsAt` no es un Horario reservable de ningún Empleado
   * @throws {ConflictError} el horario nuevo pisa otro Turno del Empleado
   */
  async execute(link: string, startsAt: Date): Promise<ClientBooking> {
    const booking = await findBookingByLink(this.bookings, link);
    const rescheduled = await rescheduleResolvedBooking(
      this.bookings,
      this.services,
      this.listSlots,
      booking,
      startsAt,
    );
    await notifyClients([rescheduled], (email, noticeLink) =>
      this.mailer.sendBookingReschedule(email, noticeLink),
    );
    return rescheduled;
  }
}
