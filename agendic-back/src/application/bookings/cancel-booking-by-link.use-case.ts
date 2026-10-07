import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';
import { findBookingByLink } from './find-booking-by-link';

/** Cancela un Turno pendiente o aceptado por su Enlace del Turno, hasta que empieza (ADR 0022). */
@Injectable()
export class CancelBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó
   */
  async execute(link: string): Promise<ClientBooking> {
    const booking = await findBookingByLink(this.bookings, link);
    if (booking.startsAt <= this.clock.now())
      throw new BusinessRuleError(`Turno ${booking.id} already started`);
    return this.bookings.cancelPendingOrBooked(booking.id);
  }
}
