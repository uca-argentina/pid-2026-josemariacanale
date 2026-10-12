import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';
import { findBookingByLink } from './find-booking-by-link';

/**
 * Paga la Seña de un Turno pendiente o aceptado por su Enlace del Turno, hasta que empieza (ADR 0027). Es simulado:
 * Agendic no cobra, solo registra cuándo se pagó. No manda mail.
 */
@Injectable()
export class PayDepositByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada
   */
  async execute(link: string): Promise<ClientBooking> {
    const now = this.clock.now();
    const booking = await findBookingByLink(this.bookings, link);
    if (booking.startsAt <= now)
      throw new BusinessRuleError(`Turno ${booking.id} already started`);
    if (booking.depositAmount === null)
      throw new BusinessRuleError(`Turno ${booking.id} has no Seña`);
    if (booking.depositPaidAt)
      throw new BusinessRuleError(`Turno ${booking.id} already has its Seña paid`);
    return this.bookings.payDeposit(booking.id, now);
  }
}
